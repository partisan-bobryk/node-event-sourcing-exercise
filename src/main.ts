import express from "express";
import {
  buildAddTransactionRoute,
  buildPointBalanceRoute,
  buildSpendPointsRoute,
} from "./routes";
import { TransactionService } from "./transaction.service";

const port = process.env.NODE_PORT ?? 8080;
const app = express();
app.use(express.json());

const transactionService: TransactionService = new TransactionService();

app.post("/transactions", buildAddTransactionRoute(transactionService));
app.put("/transactions", buildSpendPointsRoute(transactionService));
app.get("/transactions", buildPointBalanceRoute(transactionService));

app.listen(port, () => {
  console.log(`Server starting on port ${port}`);
});
