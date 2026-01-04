import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("检查 users 表结构...\n");

const [columns] = await connection.execute(`
  DESCRIBE users
`);

console.log("users 表字段列表：");
console.table(columns);

await connection.end();
