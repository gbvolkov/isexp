import { getArgs } from "./helpers/args";
import * as mongoDB from "mongodb";
import * as dotenv from "dotenv";
import * as csv_writer from "csv-writer";
import * as log_services from "./services/log.service";

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
  Status: string;
  Amount: number;
  CustomerKey: string;
  DATA: CustomerData;
  Receipt: ReceiptData;
}

interface Plan2 {
  period: number;
  price: number;
}

interface PlanID {
  _id: mongoDB.ObjectId;
}


interface Subscription {
  name: string;
  description: string;
}

interface OrderSubscription {
  subscriptionId: mongoDB.ObjectId;
  userEmail: string;
  subscription: Subscription;
  plan: Plan2;
}

interface OrderPlans {
  planIDs: PlanID;
}

interface Order2 {
  _id: mongoDB.ObjectId;
  operation: string;
  updateDate: Date;
  data: OrderData;
  subscriptions: OrderSubscription[];
}

/*
        '_id': 1, 
        'school.country': 1, 
        'dateCreation': 1, 
        'activeTimeInSeconds': 1, 
        'email': 1, 
        'lastActive': 1, 
        'lastSignIn': 1, 
        'firstName': 1, 
        'students._id': 1, 
        'students.activeTimeInSeconds': 1, 
        'students.firstName': 1, 
        'students.classrooms._id': 1
*/

interface School {
  country: string;
}

interface Classroom {
  _id: mongoDB.ObjectId;
}

interface Task {
  usedTime: number;
}

interface Student {
  _id: mongoDB.ObjectId;
  activeTimeInSeconds: number; 
  firstName: string;
  classrooms: Classroom[];
  tasks: Task[];
}

interface User {
  _id: mongoDB.ObjectId;
  school: School;
  dateCreation: Date;
  activeTimeInSeconds: number;
  email: string;
  lastActive: Date;
  lastSignIn: Date; 
  firstName: string; 
  students: Student[];
}

interface csvUserData {
  userId: string;
  country: string;
  createdDate: Date;
  userActiveTime: number;
  email: string;
  lastActive: Date;
  lastSignIn: Date;
  userName: string;
  studentId: string;
  studentActiveTime: number;
  studentName: string;
  classRoomsNumber: number;
  tasksNumber: number;
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
  subscription: string | undefined;
  planPeriod: number | undefined;
}

function getSubsciption(
  db: mongoDB.Db,
  id: mongoDB.ObjectId
): Promise<Subscription | null> {
  const subscriptions = db.collection(
    process.env.SUBSCRIPTIONS_COLLECTION as string
  );

  return subscriptions.findOne<Subscription>({ _id: id });
}

async function getOrders(db: mongoDB.Db): Promise<csvData[]> {
  const csvres: csvData[] = [];
  const orders = db.collection(process.env.ORDERS_COLLECTION as string);

  const query =
  [
    {
      '$match': {
        //'_id': new mongoDB.ObjectId('612cc2654badc3970d31ab60'), 
        'operation': {
          '$in': [
            'PAYMENT', 'RENEW', 'RECURRING'
          ]
        }, 
        'data.Status': {
          '$in': [
            'CONFIRMED', 'AUTHORIZED'
          ]
        }
      }
    }, {
      '$addFields': {
        'userSubscriptions': {
          '$ifNull': [
            '$userSubscriptions', []
          ]
        }
      }
    }, {
      '$lookup': {
        'from': 'user_subscriptions', 
        'localField': '_id', 
        'foreignField': 'orderId', 
        'as': 'userSubscriptions'
      }
    }, {
      '$project': {
        '_id': 1, 
        'operation': 1, 
        'updateDate': 1, 
        'data': {
          'Status': 1, 
          'Amount': 1, 
          'CustomerKey': 1, 
          'DATA': {'email' : 1},
          'Receipt': {
            'Items': 1
          }
        }, 
        'userSubscriptions': {
          'userEmail': 1, 
          'subscription': {
            'name': 1, 
            'description': 1
          }, 
          'plan': {
            'period': 1, 
            'price': 1
          }
        }
      }
    }, {
      '$project': {
        '_id': 1, 
        'operation': 1, 
        'updateDate': 1, 
        'data': 1, 
        'subscriptions': {
          '$setUnion': [
            '$userSubscriptions'
          ]
        }
      }
    }
  ];

  const cursor = orders.aggregate<Order2>(query);
  const docs = await cursor.toArray();
  for (const doc of docs) {
    if (doc.subscriptions && doc.subscriptions.length > 0) {
      doc.subscriptions.forEach(function (item, idx) {
        csvres.push({
          orderId: doc._id.toHexString(),
          email: doc.subscriptions[idx].userEmail,
          customerKey: doc.data.CustomerKey,
          operation: doc.operation,
          status: doc.data.Status,
          updateDate: doc.updateDate,
          orderAmount: doc.data.Amount/100,
          itemName: item.subscription.name,
          itemAmount: doc.data.Receipt?.Items[idx]?.Amount/100,
          itemPrice: item.plan.price,
          itemQtty: doc.data.Receipt?.Items[idx]?.Quantity,
          subscription: item.subscription.description,
          planPeriod: item.plan.period,
        });
      })
    } else {
      doc.data.Receipt?.Items?.forEach(function (item, idx) {
        csvres.push({
          orderId: doc._id.toHexString(),
          email: doc.data.DATA.email,
          customerKey: doc.data.CustomerKey,
          operation: doc.operation,
          status: doc.data.Status,
          updateDate: doc.updateDate,
          orderAmount: doc.data.Amount/100,
          itemName: item.Name,
          itemAmount: doc.data.Receipt?.Items[idx]?.Amount/100,
          itemPrice: item.Price/100,
          itemQtty: doc.data.Receipt?.Items[idx]?.Quantity,
          subscription: item.Name,
          planPeriod: -1,
        });
      })
    }
  }
  return csvres;
}

async function getUsers(db: mongoDB.Db, queryType: string): Promise<csvUserData[]> {
  const csvres: csvUserData[] = [];
  const users = db.collection(process.env.USERS_COLLECTION as string);
  let query: any;
  if (queryType === "new") {
    query =
    [
      {
        '$sort': {
          'dateCreation': -1
        }
      }, {
        '$match': {
          'role': 'parent', 
          /*'dateCreation': {
            '$gt': new Date('Mon, 06 May 2022 00:00:00 GMT')
          },*/
          'isActive': true
        }
      }, {
        '$lookup': {
          'from': 'students', 
          'pipeline': [
            {
              '$lookup': {
                'from': 'classrooms', 
                'localField': '_id', 
                'foreignField': 'students.studentUserId', 
                'as': 'classrooms'
              }
            }, {
              '$lookup': {
                'from': 'solved_tasks', 
                'localField': '_id', 
                'foreignField': 'student', 
                'as': 'tasks'
              }
            }, {
              '$project': {
                '_id': 1, 
                'activeTimeInSeconds': 1, 
                'firstName': 1, 
                'classrooms._id': 1, 
                'tasks.usedTime': 1
              }
            }, {
              '$match': {
                'classrooms': {
                  '$size': 0
                }, 
                '$expr': {
                  '$gt': [
                    {
                      '$size': '$tasks'
                    }, 0
                  ]
                }
              }
            }
          ], 
          'localField': '_id', 
          'foreignField': 'parent', 
          'as': 'students'
        }
      }, {
        '$match': {
          'students': {
            '$size': 1
          }
        }
      }, {
        '$project': {
          '_id': 1, 
          'school.country': 1, 
          'dateCreation': 1, 
          'activeTimeInSeconds': 1, 
          'email': 1, 
          'lastActive': 1, 
          'lastSignIn': 1, 
          'firstName': 1, 
          'students._id': 1, 
          'students.activeTimeInSeconds': 1, 
          'students.firstName': 1, 
          'students.classrooms._id': 1, 
          'students.tasks': 1
        }
      }, {
        '$limit': 40
      }
    ];
  } else {
    const lastSignIn = new Date();
    lastSignIn.setDate(lastSignIn.getDate()-30);
    query =
    [
      {
        '$match': {
          'role': 'parent', 
          'lastSignIn': {
            '$gt': lastSignIn
          },
          'isActive': true
        }
      }, {
        '$lookup': {
          'from': 'students', 
          'pipeline': [
            {
              '$lookup': {
                'from': 'classrooms', 
                'localField': '_id', 
                'foreignField': 'students.studentUserId', 
                'as': 'classrooms'
              }
            }, {
              '$lookup': {
                'from': 'solved_tasks', 
                'localField': '_id', 
                'foreignField': 'student', 
                'as': 'tasks'
              }
            }, {
              '$project': {
                '_id': 1, 
                'activeTimeInSeconds': 1, 
                'firstName': 1, 
                'classrooms._id': 1, 
                'tasks.usedTime': 1
              }
            }
          ], 
          'localField': '_id', 
          'foreignField': 'parent', 
          'as': 'students'
        }
      }, {
        '$match': {
          'students': {
            '$size': 1
          }
        }
      }, {
        '$project': {
          '_id': 1, 
          'school.country': 1, 
          'dateCreation': 1, 
          'activeTimeInSeconds': 1, 
          'email': 1, 
          'lastActive': 1, 
          'lastSignIn': 1, 
          'firstName': 1, 
          'students._id': 1, 
          'students.activeTimeInSeconds': 1, 
          'students.firstName': 1, 
          'students.classrooms._id': 1, 
          'students.tasks': 1
        }
      }, {
        '$limit': 40
      }
    ];
  }
  const cursor = users.aggregate<User>(query);
  const docs = await cursor.toArray();
  
  for (const doc of docs) {
    if (doc.students && doc.students.length > 0) {
      doc.students.forEach(function (item, idx) {
        //if (item.tasks?item.tasks.length:0 > 0) {
          csvres.push({
            userId: doc._id.toHexString(),
            country: doc.school?.country?doc.school.country:"",
            createdDate: doc.dateCreation,
            userActiveTime: doc.activeTimeInSeconds,
            email: doc.email,
            lastActive: doc.lastActive,
            lastSignIn: doc.lastSignIn,
            userName: doc.firstName,
            studentId: item._id.toHexString(),
            studentActiveTime: item.activeTimeInSeconds,
            studentName: item.firstName,
            classRoomsNumber: item.classrooms?item.classrooms.length:0,
            tasksNumber: item.tasks?item.tasks.length:0,
          });
        //}
      });
    }
  }

  return csvres;
}

async function main(): Promise<void> {
	const args = getArgs(process.argv);

  if (args.h) {
	  return log_services.printHelp();
  }

  let fileName: string;
  if (args.f) {
    fileName = args.f;
  } else {
	  return log_services.printHelp();
  }

  dotenv.config();

  const client: mongoDB.MongoClient = new mongoDB.MongoClient(
    process.env.DB_CONN_STRING as string
  );

  try {
    await client.connect();

    const db = client.db(process.env.DB_NAME);
    if (args.o) {
        const csvw = csv_writer.createObjectCsvWriter({
        path: fileName,
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
          { id: "subscription", title: "Subscription" },
          { id: "planPeriod", title: "Period" },
        ],
      });

      const csvres = await getOrders(db);
      csvw
        .writeRecords(csvres)
        .then(() => console.log("The CSV file was written successfully"));
      return;
    }

    if (args.a || args.l) {
      const csvw = csv_writer.createObjectCsvWriter({
        path: fileName,
        header: [
          { id: "userId", title: "UserID" },
          { id: "country", title: "Country" },
          { id: "createdDate", title: "Created" },
          { id: "userActiveTime", title: "UserActivity" },
          { id: "email", title: "EMail" },
          { id: "lastActive", title: "LastActive" },
          { id: "lastSignIn", title: "LastSignIn" },
          { id: "userName", title: "UserName" },
          { id: "studentId", title: "studentID" },
          { id: "studentActiveTime", title: "StudentActivity" },
          { id: "studentName", title: "StudentName" },
          { id: "classRoomsNumber", title: "ClassRooms" },
          { id: "tasksNumber", title: "TasksSolved" },
        ],
      });

      const csvres = await getUsers(db, args.a?"new":"old");
      csvw
        .writeRecords(csvres)
        .then(() => console.log("The CSV file was written successfully"));
    }
  } 
  catch(err) {
    console.log("ERRRR!!!", err);
  }
  finally {
    await client.close();
  }
  return;
}


main();
