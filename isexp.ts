import { getArgs } from "./helpers/args";
import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import * as csv_writer from "csv-writer";

var url = "mongodb://localhost:27017/ismart";

interface ItemData {
  Name: string;
  Amount: number;
  Price: number;
  Quantity: number;
  Tax: string;
  PaymentMethod: string;
  PaymentObject: string;
}

interface ReceiptData {
  Items: ItemData[];
}

interface CustomerData {
  email: string;
}

interface OrderData {
  CustomerKey: string;
  Amount: number;
  Status: string;
  DATA: CustomerData;
  Receipt: ReceiptData;
}

interface OrderSubscription {
  subscriptionId: mongoDB.ObjectId;
  planId: mongoDB.ObjectId;
}

interface OrderUserSubscription {
  userSubscriptionId: mongoDB.ObjectId;
  period: number;
}

interface Order {
  _id: mongoDB.ObjectId;
  operation: string;
  updateDate: Date;
  data: OrderData;
  subscriptions: OrderSubscription[];
  userSubscriptions: OrderUserSubscription[];
}

interface Plan {
  _id: mongoDB.ObjectId;
  period: number;
  price: number;
}

interface Subscription {
  name: string;
  description: string;
  plans: Plan[];
}

interface csvData {
  orderId: string;
  operation: string;
  updateDate: Date;
  customerKey: string;
  orderAmount: number;
  status: string;
  email: string;
  itemName: string;
  itemAmount: number;
  itemPrice: number;
  itemQtty: number;
  subscriptionName: string | undefined;
  planPeriod: number | undefined;
  subscriptionId: mongoDB.ObjectId;
  planId: mongoDB.ObjectId;
  /*;
	itemPaymentMethod: string;
	itemPaymentObject: string;*/
}

function getSubsciption(
  db: mongoDB.Db,
  id: mongoDB.ObjectId
): Promise<Subscription | null> {
  const subscriptions = db.collection(
    process.env.SUBSCRIPTIONS_COLLECTION as string
  );

  const result = subscriptions.findOne<Subscription>({ _id: id });
  return result;
}

async function getOrders(db: mongoDB.Db): Promise<csvData[]> {
  const csvres: csvData[] = [];
  const orders = db.collection(process.env.ORDERS_COLLECTION as string);

  const query = {
    operation: { $in: ["PAYMENT", "RENEW"] },
    "data.Status": "CONFIRMED",
  };

  const cursor = orders.find<Order>(query, {
    projection: {
      _id: 1,
      operation: 1,
      updateDate: 1,
      data: {
        Status: 1,
        Amount: 1,
        CustomerKey: 1,
        DATA: { email: 1 },
        Receipt: { Items: 1 },
      },
      subscriptions: {
        subscriptionId: 1,
        planId: 1,
      },
      userSubscriptions: {
        userSubscriptionId: 1,
        period: 1,
      },
    },
  });

  const getSubscriptionPromises: Promise<Subscription | null>[] = [];
  const docs = await cursor.toArray();

  for (const doc of docs) {
    doc.data.Receipt.Items.forEach(function (item, idx) {
      var subscriptionId: mongoDB.ObjectId;
      if (doc.operation === "RENEW") {
        subscriptionId = doc.userSubscriptions[idx]?.userSubscriptionId;
      } else {
        subscriptionId = doc.subscriptions[idx]?.subscriptionId;
      }
      csvres.push({
        orderId: doc._id.toHexString(),
        email: doc.data.DATA.email,
        customerKey: doc.data.CustomerKey,
        operation: doc.operation,
        status: doc.data.Status,
        updateDate: doc.updateDate,
        orderAmount: doc.data.Amount,
        itemName: item.Name,
        itemAmount: item.Amount,
        itemPrice: item.Price,
        itemQtty: item.Quantity,
        subscriptionId: subscriptionId,
        planId: doc.subscriptions[idx]?.planId,
        subscriptionName: "",
        planPeriod: doc.userSubscriptions[idx]?.period,
      });
      getSubscriptionPromises.push(getSubsciption(db, subscriptionId));
    });
  }

  const subscriptions = await Promise.all(getSubscriptionPromises);
  csvres.forEach(function (row, idx) {
    row.subscriptionName = subscriptions[idx]?.name;
    if (row.operation === "PAYMENT") {
      row.planPeriod = subscriptions[idx]?.plans.find(
        (plan) => plan._id.toHexString() === row.planId?.toHexString()
      )?.period;
    }
  });

  return csvres;
}

async function main(): Promise<void> {
  dotenv.config();

  const client: mongoDB.MongoClient = new mongoDB.MongoClient(
    process.env.DB_CONN_STRING as string
  );

  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME);
    const csvw = csv_writer.createObjectCsvWriter({
      path: "orders.csv",
      header: [
        { id: "orderId", title: "OrderID" },
        { id: "email", title: "EMail" },
        { id: "customerKey", title: "CustomerKey" },
        { id: "operation", title: "Operation" },
        { id: "status", title: "Status" },
        { id: "updateDate", title: "OrderDate" },
        { id: "orderAmount", title: "OrderAmount" },
        { id: "itemName", title: "ItemName" },
        { id: "itemAmount", title: "ItemAmount" },
        { id: "itemPrice", title: "ItemPrice" },
        { id: "itemQtty", title: "ItemQuantity" },
        { id: "subscriptionName", title: "Subscription" },
        { id: "planPeriod", title: "Period" },
      ],
    });

    const csvres = await getOrders(db);
    csvw
      .writeRecords(csvres)
      .then(() => console.log("The CSV file was written successfully"));
  } finally {
    await client.close();
  }
  return;
}

main();
