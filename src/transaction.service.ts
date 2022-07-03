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
  removePoints(pointsToRemove: number): TransactionService {
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
     * improper point calculation would be cought by the test.
     */
    const depletedTransactionIndexes: Set<number> = new Set();
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

      /*
       * Check if we actually depleted any payers and if so remove them.
       *
       * It may be silly to keep track of which index to remove in a set, as we can
       * totally minimize our space complexity by using one variable to track the last
       * index to be removed. Then once we are done, purge any transactions up to the
       * last index; however, this current approach allows us to easily implement filtering.
       *
       * For example, "Remove (points) only from (payer) until (time)"
       */
      if (this.transactionStore[i].points === 0) {
        depletedTransactionIndexes.add(i);
      }
    }

    if (!depletedTransactionIndexes.size) {
      return this;
    }

    /*
     * After we have depleted the points we need to comb through the transaction list and remove the indexes.
     *
     * The reason why we didn't do it as part of the point calculation loop is because madification to the array will
     * cause reindexing and this might lead to a bad index pointer.
     */
    this.transactionStore = this.transactionStore.filter(
      (_, index) => !depletedTransactionIndexes.has(index)
    );

    return this;
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
    return b.timestamp.getTime() - a.timestamp.getTime();
  }
}
