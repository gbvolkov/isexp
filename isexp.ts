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

interface Order {
  _id: mongoDB.ObjectId;
  operation: string;
  updateDate: Date;
  data: OrderData;
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
	itemQtty: number/*;
	itemPaymentMethod: string;
	itemPaymentObject: string;*/
}


const main = async () => {
  dotenv.config();

  const client: mongoDB.MongoClient = new mongoDB.MongoClient(
    process.env.DB_CONN_STRING as string
  );

  try {
    await client.connect();

    const db: mongoDB.Db = client.db(process.env.DB_NAME);
    const orders: mongoDB.Collection = db.collection(
      process.env.ORDERS_COLLECTION as string
    );
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
      },
    });
	const csvw = csv_writer.createObjectCsvWriter({
		path: 'orders.csv',
		header: [
			{id: 'orderId', title: 'orderID'},
			{id: 'email', title: 'email'},
			{id: 'customerKey', title: 'CustomerKey'},
			{id: 'operation', title: 'operation'},
			{id: 'status', title: 'Status'},
			{id: 'updateDate', title: 'updateDate'},
			{id: 'orderAmount', title: 'OrderAmount'},
			{id: 'itemName', title: 'ItemName'},
			{id: 'itemAmount', title: 'ItemAmount'},
			{id: 'itemPrice', title: 'ItemPrice'},
			{id: 'itemQtty', title: 'ItemQuantity'},
		]
	});

	const csvres: csvData[] = [];

	await cursor.forEach(function (doc) {
      doc.data.Receipt.Items.forEach(function (item) {
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
			itemQtty: item.Quantity
		  });
      });
    });

	csvw.writeRecords(csvres)
	.then(()=> console.log('The CSV file was written successfully'));

  } finally {
    await client.close();
  }
  return;
};

main();
