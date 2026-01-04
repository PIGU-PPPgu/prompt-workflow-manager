import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const connection = await mysql.createConnection(process.env.DATABASE_URL);

console.log("修复数据库表结构...");

try {
  // 添加 phoneNumber 字段
  await connection.execute(`
    ALTER TABLE users
    ADD COLUMN phoneNumber VARCHAR(20) AFTER email
  `);
  console.log("✓ 已添加 phoneNumber 字段");
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log("✓ phoneNumber 字段已存在");
  } else {
    console.error("错误:", err.message);
  }
}

console.log("\n✅ 数据库修复完成!");
await connection.end();
