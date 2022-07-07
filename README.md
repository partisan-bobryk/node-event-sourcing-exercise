# howling-narwhal

A simple web server that demonstrates Event Sourcing.

## Setup

### Requirements

- node `v16` or greater. [Download NodeJS LTS version](https://nodejs.org/en/download/)

### Building

Before you can start the web server you must first build the source.

1. Run `npm install` to install all the required dependencies.
2. `npm run build` to compile the source directory into `/dist`.

## Usage

To communicate with the server, Postman is recommended as the software makes testing api routes super easy. I also provided the curl commands below so you can copy and paste them into your terminal or you can use the scripts provided in the `/bin` directory.

Script usage as follows:

```bash
bash bin/list_transactions.sh
```

**Running the Server**

1. Make sure to build the source by running `npm run build`
2. Start the server by typing in `npm run start`
3. The server should have started and accessible on port `8080` by default. `http://localhost:8080` is the default route.

### API Routes

| Route           | Method | Required Payload                                                                                                           | Description                                                                                                                            |
| --------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `/transactions` | `POST` | `{"payer": string, "points": number, "timestamp": string}` or `[{"payer": string, "points": number, "timestamp": string}]` | Can accept a single object or a list of transactions. It will perform validation and deserialization into a proper Transaction object. |
| `/transactions` | `GET`  | --                                                                                                                         | Get a current projection of payers and their accumulated points.                                                                       |
| `/transactions` | `PUT`  | `{ "points": number }`                                                                                                     | Allow user to "spend" points. This will go through the transactions and correctly calculate how much to withdraw from each payer       |

### API Examples

**Example 1**

Setting up a bunch of transactions at one time

```bash
curl -XPOST -H "Content-type: application/json" -d '[
    {
        "payer": "DANNON",
        "points": 1000,
        "timestamp": "2020-11-02T14:00:00Z"
    },
    {
        "payer": "UNILEVER",
        "points": 200,
        "timestamp": "2020-10-31T11:00:00Z"
    },
    {
        "payer": "DANNON",
        "points": -200,
        "timestamp": "2020-10-31T15:00:00Z"
    },
    {
        "payer": "MILLER COORS",
        "points": 10000,
        "timestamp": "2020-11-01T14:00:00Z"
    },
    {
        "payer": "DANNON",
        "points": 300,
        "timestamp": "2020-10-31T10:00:00Z"
    }
]' 'http://localhost:8080/transactions'
```

Expected Result

```bash
{"data":"Ok"}
```

**Example 2**

Spending points

```bash
curl -XPUT -H "Content-type: application/json" -d '{"points": 5000 }' 'http://localhost:8080/transactions'
```

Expected Result

```bash
{"data":[{"payer":"DANNON","points":-100},{"payer":"UNILEVER","points":-200},{"payer":"MILLER COORS","points":-4700}]}
```

**Example 3**

Getting totals for all payers

```bash
curl -XGET -H "Content-type: application/json" 'http://localhost:8080/transactions'
```

Expected Result

```bash
{"data":{"DANNON":1000,"UNILEVER":0,"MILLER COORS":5300}}
```
