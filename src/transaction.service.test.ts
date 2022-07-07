import { Transaction } from "./transaction.model";
import { TransactionService } from "./transaction.service";

describe("TransactionService", () => {
  const mockTransactions: Transaction[] = [
    {
      payer: "DANNON",
      points: 1000,
      timestamp: new Date("2020-11-02T14:00:00Z"),
    },
    {
      payer: "UNILEVER",
      points: 200,
      timestamp: new Date("2020-10-31T11:00:00Z"),
    },
    {
      payer: "DANNON",
      points: -200,
      timestamp: new Date("2020-10-31T15:00:00Z"),
    },
    {
      payer: "MILLER COORS",
      points: 10000,
      timestamp: new Date("2020-11-01T14:00:00Z"),
    },
    {
      payer: "DANNON",
      points: 300,
      timestamp: new Date("2020-10-31T10:00:00Z"),
    },
  ];
  let transactionService: TransactionService;
  beforeEach(() => {
    transactionService = new TransactionService();
  });

  afterEach(() => {
    transactionService = null;
  });

  test("add", () => {
    transactionService.add(mockTransactions[0], mockTransactions[1]);
    expect(transactionService.transactionStore).toHaveLength(2);
    // Expect that it is ordered
    expect(transactionService.transactionStore[0].payer).toBe(
      mockTransactions[1].payer
    );
  });

  test("spend points without overdraft", () => {
    transactionService.add(...mockTransactions);
    expect(transactionService.transactionStore).toHaveLength(
      mockTransactions.length
    );

    transactionService.spendPoints(5000);
    expect(transactionService.transactionSnapshotBalance).toStrictEqual({
      DANNON: 1000,
      UNILEVER: 0,
      "MILLER COORS": 5300,
    });
  });

  test("spend points with overdraft", () => {
    transactionService.add(...mockTransactions);
    expect(transactionService.transactionStore).toHaveLength(
      mockTransactions.length
    );

    transactionService.spendPoints(5000);
    transactionService.spendPoints(5000);
    transactionService.spendPoints(5000);
    transactionService.spendPoints(5000);
    expect(transactionService.transactionSnapshotBalance).toStrictEqual({
      DANNON: 0,
      UNILEVER: 0,
      "MILLER COORS": 0,
    });
  });
});
