import express from "express";
import { Transaction } from "./transaction.model";
import { TransactionService } from "./transaction.service";

export type RouteDefinition = {
  (transactionService: TransactionService): (
    req: express.Request,
    res: express.Response
  ) => any;
};

export const buildAddTransactionRoute: RouteDefinition = (
  transactionService: TransactionService
) => {
  return (req: express.Request, res: express.Response) => {
    if (!req?.body) {
      return failedResponse(res, "Missing request payload", 400);
    }

    const rawTransactions: any | any[] = req.body;
    let transactions: Transaction[] = [];
    try {
      if (Array.isArray(rawTransactions)) {
        for (const rawTransaction of rawTransactions) {
          const transaction = unmarshalTransaction(rawTransaction);
          transactions.push(transaction);
        }
      } else {
        const transaction = unmarshalTransaction(rawTransactions);
        transactions = [transaction];
      }

      transactionService.add(...transactions);
    } catch (err) {
      return failedResponse(res, err?.message, 400);
    }

    return successfulResponse(res, "Ok");
  };
};

export const buildSpendPointsRoute: RouteDefinition = (
  transactionService: TransactionService
) => {
  return (req: express.Request, res: express.Response) => {
    if (!req?.body) {
      return failedResponse(res, "Missing request payload", 400);
    }

    const pointsPayload: { points: number } = req.body;

    if (!pointsPayload?.points) {
      return failedResponse(res, "Missing points field", 400);
    }

    if (isNaN(pointsPayload?.points) || pointsPayload.points < 0) {
      return failedResponse(
        res,
        "Points field must be a valid positive number"
      );
    }

    try {
      const spentPoints: Partial<Transaction>[] =
        transactionService.spendPoints(pointsPayload.points);
      return successfulResponse(res, spentPoints);
    } catch (err) {
      return failedResponse(res, err?.message);
    }
  };
};

export const buildPointBalanceRoute: RouteDefinition = (
  transactionService: TransactionService
) => {
  return (req: express.Request, res: express.Response) => {
    return successfulResponse(res, transactionService.showPayerPoints());
  };
};

const unmarshalTransaction = (payload: Record<string, any>): Transaction => {
  const transaction: Transaction = {
    payer: payload["payer"],
    points: payload["points"],
    timestamp: new Date(payload["timestamp"]),
  };

  validateTransaction(transaction);

  return transaction;
};

const validateTransaction = (transaction: Transaction): void => {
  if (!transaction["payer"]) {
    throw new Error("Missing payer field");
  }

  if (!transaction["timestamp"]) {
    throw new Error("Timestamp must be a valid date");
  }

  if (!transaction["points"] || isNaN(transaction["points"])) {
    throw new Error("Missing points field, must be a positive number");
  }
};

const successfulResponse = (res: express.Response, payload: any) =>
  res.status(200).json({ data: payload });

const failedResponse = (
  res: express.Response,
  errorMessage: string,
  statusCode: number = 500
) => res.status(statusCode).json({ error: errorMessage });
