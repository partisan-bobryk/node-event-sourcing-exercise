import crypto from "crypto";
import { Transaction } from "./transaction.model";

export class TransactionService {
  /**
   * A simple in-memory data store of all recorded transactions.
   */
  transactionStore: Transaction[] = [];
  /**
   * A temporary state representation of all payers and their accumulated points.
   */
  transactionSnapshotBalance: Record<string, number> = {};

  /**
   * Add one or many transaction at one time.
   *
   * @remarks
   * This also performs a sort on the transaction list
   *
   * @example
   * You can add one transaction at a time
   * ```
   * const transaction: Transaction = {...}
   * transactionService.add(transaction)
   * ```
   * or you can add multiple
   * ```
   * const transaction1: Transaction = {...}
   * const transaction2: Transaction = {...}
   * const transaction3: Transaction = {...}
   * transactionService.add(transaction1, transaction2, transaction3)
   * ```
   *
   * @param transactions
   */
  add(...transactions: Transaction[]): void {
    this.transactionStore.push(...transactions);

    /*
     * One of the requirements is to be able to remove points
     * from the oldest transactions first. Sorting can be an expensive operation
     * so we should do it as least as possible. By paying the price upfront,
     * we can save some time on more frequent operations such as using up points.
     */
    this.transactionStore.sort(this.sortByTimeFn);
    this.transactionSnapshotBalance = this.buildProjection();
  }

  /**
   * Remove some number of points
   *
   * @remarks
   * Number of points to remove must be a positive number
   *
   * @example
   * ```
   * transactionService.removePoints(400)
   * ```
   *
   * @param pointsToRemove
   * @returns TransactionService
   */
  spendPoints(pointsToSpend: number): Partial<Transaction>[] {
    if (isNaN(pointsToSpend) || pointsToSpend < 0) {
      throw new Error("Points to spend must be a valid positive number");
    }

    const totalNumberOfTransactions: number = this.transactionStore.length;
    let pointsLeft: number = pointsToSpend;
    let transactionIndex: number = 0;

    while (pointsLeft > 0) {
      if (transactionIndex >= totalNumberOfTransactions) {
        // No more transactions to go through
        break;
      }

      const { points, payer } = this.transactionStore[transactionIndex];

      /*
       * Using Math.min we can clamp the number of allowed
       * points that can be removed.
       *
       * We are limited by three things:
       * 1. The number of points we have left over from our initial request
       * 2. The number of points available as part of this transaction
       * 3. The total balance of the payer.
       */
      const pointsToRemove: number = Math.min(
        Math.min(points, pointsLeft),
        this.transactionSnapshotBalance[payer]
      );

      if (this.transactionSnapshotBalance[payer] <= 0) {
        // Skip to the next transaction
        transactionIndex++;
        continue;
      }

      pointsLeft -= pointsToRemove;

      /*
       * We shouldn't be modifying the state or the transactions directly as it breaks
       * the event sourcing paradigm. Instead we should make a new transaction
       * that will remove the maximum number of allowed points. When we need the balance
       * we would only have to add up the transaction to get our true state.
       */
      const transaction: Transaction = {
        payer,
        points: -1 * pointsToRemove,
        timestamp: new Date(),
      };
      this.add(transaction);

      transactionIndex++;
    }

    /*
     * One of the cool benefits of event sourcing is that we can just grab the last
     * few transactions to get the distribution of the points we wanted to spend
     */
    const spentProjection = this.buildProjectionFromIndex(
      totalNumberOfTransactions
    );

    return Object.entries(spentProjection).map(([payer, points]) => ({
      payer,
      points,
    }));
  }

  /**
   * Simply returns the last cached projection
   *
   * @returns Record<string, number>
   */
  showPayerPoints(): Record<string, number> {
    return this.transactionSnapshotBalance;
  }

  private buildProjection(fromTimestamp?: Date): Record<string, number> {
    /*
     * Assume set of all transaction is finite, the transaction that we are looking for
     * divides the whole set into two subsets. Where subset A contains all transactions with lower value timestamps,
     * while subset B contains transactions with larger value timestamps than the provided timestamp. We build our
     * projections in the forward directions such that the last timestamp would always be getting bigger.
     *
     * The reason why this is important is this idea dictates the higher probability of finding a timestamp in subset B. In
     * a brute force approach this would allow us to search from the most recent transactions backwards, but we can go even faster
     * if we use binary search. The transactions are already sorted as they are being added.
     *
     * Note: It is not recommended to use an index to keep track of the last transaction as we can insert transactions with any timestamp
     * and that alone will throw off the index accuracy.
     */
    if (!fromTimestamp) {
      return this.buildProjectionFromIndex();
    }

    const startIndex = this.findIndexFromTimestamp(
      this.transactionStore,
      fromTimestamp
    );

    return this.buildProjectionFromIndex(startIndex + 1);
  }

  /**
   * Starts projecting transactions at a specified index
   *
   * @param index
   * @returns
   */
  private buildProjectionFromIndex(index: number = 0): Record<string, number> {
    const startIdx = Math.max(index, 0);
    const projection: Record<string, number> = {};

    const subsetTransactions: Transaction[] =
      this.transactionStore.slice(startIdx);

    for (const transaction of subsetTransactions) {
      // Explicitly using undefined as JS treats 0 as falsy value
      if (projection[transaction.payer] === undefined) {
        projection[transaction.payer] = 0;
      }
      projection[transaction.payer] += transaction.points;
    }

    return projection;
  }

  /**
   * A simple sorting function that will sort transactions in a descending order
   * based on the timestamp.
   *
   * @param a Transaction
   * @param b Transaction
   * @returns
   */
  private sortByTimeFn(a: Transaction, b: Transaction): number {
    // date.getTime() gives us the date in milliseconds.
    return a.timestamp.getTime() - b.timestamp.getTime();
  }

  /**
   * Performs a binary search through the transactions.
   *
   * Will return -1 if not found or an index from the array that contains the timestamp
   *
   * @param transactions
   * @param timestamp
   * @returns number
   */
  private findIndexFromTimestamp(
    transactions: Transaction[],
    timestamp: Date
  ): number {
    let foundIndex;
    let lowBounds = 0;
    let highBounds = transactions?.length - 1;

    while (lowBounds <= highBounds) {
      // Find the mid point
      foundIndex = Math.floor((lowBounds + highBounds) / 2);
      if (transactions[foundIndex].timestamp.getTime() < timestamp.getTime()) {
        lowBounds = foundIndex + 1;
      } else if (
        transactions[foundIndex].timestamp.getTime() > timestamp.getTime()
      ) {
        highBounds = foundIndex - 1;
      } else {
        return foundIndex;
      }
    }
    return -1;
  }

  /**
   * Generate a hash for the transaction in order to verify integrity
   *
   * @param transaction
   * @returns string
   */
  private hashTransaction(transaction: Transaction): string {
    return crypto
      .createHash("sha256")
      .update(JSON.stringify(transaction))
      .digest("hex");
  }
}
