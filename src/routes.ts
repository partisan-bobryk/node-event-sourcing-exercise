import express from "express";
import { Transaction } from "./transaction.model";
import { TransactionService } from "./transaction.service";

export type RouteDefinition = {
  (transactionService: TransactionService): (
    req: express.Request,
    res: express.Response
  ) => any;
};

const buildAddTransactionRoute: RouteDefinition = (
  transactionService: TransactionService
) => {
  return (req: express.Request, res: express.Response) => {
    const rawTransactions: Transaction | Transaction[] = req.body;
    let transactions: Transaction[];

    try {
      if (Array.isArray(rawTransactions)) {
        transactions = rawTransactions?.map((rawTransactions) => {
          return {
            ...rawTransactions,
            timestamp: new Date(rawTransactions?.timestamp),
          };
        });
      } else {
        transactions = [
          { ...rawTransactions, timestamp: rawTransactions?.timestamp },
        ];
      }

      transactionService.add(...transactions);
    } catch (err) {
      res.status(500).json({
        error: err?.message,
      });
    }

    res.status(200).json({ Ok: 200 });
  };
};

const buildSpendPointsRoute: RouteDefinition = (
  transactionService: TransactionService
) => {
  return (req: express.Request, res: express.Response) => {};
};

const buildPointBalanceRoute: RouteDefinition = (
  transactionService: TransactionService
) => {
  return (req: express.Request, res: express.Response) => {
    res.status(200).json(transactionService.transactionStore);
  };
};

export {
  buildAddTransactionRoute,
  buildSpendPointsRoute,
  buildPointBalanceRoute,
};
