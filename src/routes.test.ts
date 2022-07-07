import request from "supertest";
import {
  buildAddTransactionRoute,
  buildPointBalanceRoute,
  buildSpendPointsRoute,
} from "./routes";
import { TransactionService } from "./transaction.service";
import express from "express";

const app = express();
const defaultRoute = "/transactions";

app.use(express.json());

describe("routes", () => {
  let transactionService: TransactionService;
  let transactionAddSpy: any;
  let transactionSpendPointsSpy: any;
  let transactionShowPayerPointsSpy: any;

  beforeAll(() => {
    transactionService = new TransactionService();
    transactionAddSpy = jest.spyOn(transactionService, "add");
    transactionSpendPointsSpy = jest.spyOn(transactionService, "spendPoints");
    transactionShowPayerPointsSpy = jest.spyOn(
      transactionService,
      "showPayerPoints"
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("routes:addTransactionRoute", () => {
    let addTransactionRoute;

    beforeAll(() => {
      addTransactionRoute = buildAddTransactionRoute(transactionService);
      app.post(defaultRoute, addTransactionRoute);
    });

    test("missing payload", async () => {
      const res = await request(app).post(defaultRoute);
      expect(transactionAddSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toEqual("Missing request payload");
    });

    test("validation of payer field", async () => {
      const transactionPayload: Record<string, any> = {
        points: 300,
      };
      const res = await request(app)
        .post(defaultRoute)
        .send(transactionPayload);
      expect(transactionAddSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toBe("Missing payer field");
    });

    test("validation of points field", async () => {
      const transactionPayload: Record<string, any> = {
        payer: "test payer",
        timestamp: new Date().toString(),
      };
      const res = await request(app)
        .post(defaultRoute)
        .send(transactionPayload);
      expect(transactionAddSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toBe("Missing points field, must be a number");
    });

    test("validation of timestamp field", async () => {
      const transactionPayload: Record<string, any> = {
        payer: "test payer",
        points: 200,
      };
      const res = await request(app)
        .post(defaultRoute)
        .send(transactionPayload);
      expect(transactionAddSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toBe("Timestamp must be a valid date");
    });

    test("adds single transaction", async () => {
      const transactionPayload: Record<string, any> = {
        payer: "test payer",
        points: 200,
        timestamp: new Date().toString(),
      };
      const res = await request(app)
        .post(defaultRoute)
        .send(transactionPayload);
      expect(transactionAddSpy).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toBe("Ok");
    });

    test("adds multiple transaction", async () => {
      const transactionPayload: Record<string, any>[] = [
        {
          payer: "test payer",
          points: 200,
          timestamp: new Date().toString(),
        },
        {
          payer: "testPayer",
          points: 400,
          timestamp: new Date().toString(),
        },
      ];
      const res = await request(app)
        .post(defaultRoute)
        .send(transactionPayload);
      expect(transactionAddSpy).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toBe("Ok");
    });
  });
  describe("routes:spendPointsRoute", () => {
    let spendPointsRoute;

    beforeAll(() => {
      spendPointsRoute = buildSpendPointsRoute(transactionService);
      app.put(defaultRoute, spendPointsRoute);
    });

    test("missing payload", async () => {
      const res = await request(app).put(defaultRoute);
      expect(transactionSpendPointsSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toEqual("Missing request payload");
    });

    test("validate points field to be a positive number", async () => {
      const pointsPayload = {
        points: -2,
      };
      const res = await request(app).put(defaultRoute).send(pointsPayload);
      expect(transactionSpendPointsSpy).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error).toEqual(
        "Points field must be a valid positive number"
      );
    });

    test("spend points", async () => {
      const pointsPayload = {
        points: 200,
      };
      const res = await request(app).put(defaultRoute).send(pointsPayload);
      expect(transactionSpendPointsSpy).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.error).not.toBeDefined();
    });
  });
  describe("routes:pointBalanceRoute", () => {
    let payerPointsValueRoute;

    beforeAll(() => {
      payerPointsValueRoute = buildPointBalanceRoute(transactionService);
      app.get(defaultRoute, payerPointsValueRoute);
    });

    test("show points", async () => {
      const expectedValue = { samplePayer: 300 };
      transactionShowPayerPointsSpy.mockReturnValueOnce(expectedValue);

      const res = await request(app).get(defaultRoute);
      expect(transactionShowPayerPointsSpy).toHaveBeenCalled();
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data).toStrictEqual(expectedValue);
    });
  });
});
