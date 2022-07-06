import { Transaction } from "./transaction.model";

export class TransactionService {
  /**
   * A simple in-memory data store of all recorded transactions.
   */
  transactionStore: Transaction[] = [];

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
   * @returns TransactionService
   */
  add(...transactions: Transaction[]): TransactionService {
    this.transactionStore.push(...transactions);

    /*
     * One of the requirements is to be able to remove points
     * from the oldest transactions first. Sorting can be an expensive operation
     * so we should do it as least as possible. By paying the price upfront,
     * we can save some time on more frequent operations such as using up points.
     */
    this.transactionStore.sort(this.sortByTimeFn);
    return this;
  }

  /**
   * Remove some number of points from the transaction list.
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
  spendPoints(pointsToRemove: number): Partial<Transaction>[] {
    if (isNaN(pointsToRemove) || pointsToRemove <= 0) {
      throw new Error("Points must be a valid positive value");
    }

    /*
     * The list is already sorted in chronological order. So that makes it easier
     * to remove points as we start walking through the array with the oldest
     * transaction first.
     *
     * Note that in the loop my comparison are being strict by having to be equal to 0.
     * Reason being is that if we start removing transactions with negative amounts, with logic such as pointsLeft <= 0,
     * we will never catch miscalculated points. The solution is to write robust unit test for this function to
     * cover our backs.
     *
     * Basically any changes to the logic here in the future that would cause
     * improper point calculation would be caught by the test.
     */
    const spentTransactions: Partial<Transaction>[] = [];
    const spentPayerTotal: Record<string, number> = {};
    let pointsLeft: number = pointsToRemove;

    for (let i = 0; i < this.transactionStore?.length; i++) {
      // No more points left to remove, so we're done
      if (pointsLeft === 0) {
        break;
      }

      /*
       * Using the Math.min method allows us to cap the maximum number of points we can
       * possibly remove from this transaction. This is also the likely area
       * of points being miscalculated.
       */
      const pointsToRemove: number = Math.min(
        this.transactionStore[i].points,
        pointsLeft
      );

      this.transactionStore[i].points -= pointsToRemove;
      pointsLeft -= pointsToRemove;

      if (!spentPayerTotal[this.transactionStore[i].payer]) {
        spentPayerTotal[this.transactionStore[i].payer] = 0;
      }

      spentPayerTotal[this.transactionStore[i].payer] -= pointsToRemove;
    }

    return Object.entries(spentPayerTotal).map(([payer, points]) => ({
      payer,
      points,
    }));
  }

  showPayerPoints(): Record<string, number> {
    const payerPoints: Record<string, number> = {};

    for (const transaction of this.transactionStore) {
      if (!payerPoints[transaction.payer]) {
        payerPoints[transaction.payer] = 0;
      }

      payerPoints[transaction.payer] += transaction.points;
    }

    return payerPoints;
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
}
