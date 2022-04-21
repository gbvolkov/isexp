import { getArgs } from './helpers/args';
import * as mongoDB from 'mongodb';
import * as dotenv from "dotenv";
import * as mongoose from "mongoose";

var url = 'mongodb://localhost:27017/ismart';



const main = async () => {
	const client: mongoDB.MongoClient = new mongoDB.MongoClient(process.env.DB_CONN_STRING as string);
	await client.connect();

	const db: mongoDB.Db = client.db(process.env.DB_NAME);
	const orders: mongoDB.Collection = db.collection(process.env.ORDERS_COLLECTION as string);

};

main();