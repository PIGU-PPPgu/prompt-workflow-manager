#!/usr/bin/env node

/**
 * 生成测试邀请码脚本
 *
 * 使用方法:
 * node generate-test-invitation-code.mjs
 *
 * 或直接执行（需要 chmod +x）:
 * ./generate-test-invitation-code.mjs
 */

import mysql from 'mysql2/promise';
import { nanoid } from 'nanoid';

const DATABASE_URL = process.env.DATABASE_URL || 'mysql://root:12345678@localhost:3306/prompt_workflow_manager';

async function generateTestInvitationCodes() {
  console.log('🚀 开始生成测试邀请码...\n');

  // 连接数据库
  const connection = await mysql.createConnection(DATABASE_URL);
  console.log('✅ 数据库连接成功\n');

  try {
    // 1. 检查或创建管理员用户
    const [adminUsers] = await connection.execute(
      'SELECT id, name, email, role FROM users WHERE role = ? LIMIT 1',
      ['admin']
    );

    let adminId;
    if (adminUsers.length === 0) {
      console.log('⚠️  未找到管理员用户，正在创建测试管理员...');

      const [result] = await connection.execute(
        `INSERT INTO users (openId, name, email, role, loginMethod, createdAt, updatedAt, lastSignedIn)
         VALUES (?, ?, ?, ?, ?, NOW(), NOW(), NOW())`,
        [nanoid(16), 'Test Admin', 'admin@test.com', 'admin', 'system']
      );

      adminId = result.insertId;
      console.log(`✅ 创建管理员成功 (ID: ${adminId})\n`);
    } else {
      adminId = adminUsers[0].id;
      console.log(`✅ 找到管理员: ${adminUsers[0].name || adminUsers[0].email} (ID: ${adminId})\n`);
    }

    // 2. 生成邀请码
    const codes = [
      {
        code: 'TEST2025',
        description: '测试邀请码 - 10次使用',
        maxUses: 10,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
        grantTier: 'basic',
        grantDays: 90,
      },
      {
        code: 'VIP2025',
        description: 'VIP专属码 - 无限次使用',
        maxUses: null,
        expiresAt: null,
        grantTier: 'pro',
        grantDays: 365,
      },
      {
        code: nanoid(12).toUpperCase(),
        description: '随机一次性邀请码',
        maxUses: 1,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后过期
        grantTier: 'free',
        grantDays: 0,
      },
    ];

    console.log('📝 正在生成邀请码...\n');

    for (const codeData of codes) {
      const [result] = await connection.execute(
        `INSERT INTO invitationCodes
         (code, description, createdBy, maxUses, expiresAt, grantTier, grantDays, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          codeData.code,
          codeData.description,
          adminId,
          codeData.maxUses,
          codeData.expiresAt,
          codeData.grantTier,
          codeData.grantDays,
          true,
        ]
      );

      console.log(`✅ 邀请码: ${codeData.code}`);
      console.log(`   描述: ${codeData.description}`);
      console.log(`   使用限制: ${codeData.maxUses || '无限制'}`);
      console.log(`   赠送等级: ${codeData.grantTier}`);
      console.log(`   赠送天数: ${codeData.grantDays}`);
      console.log(`   过期时间: ${codeData.expiresAt ? codeData.expiresAt.toLocaleDateString('zh-CN') : '永不过期'}`);
      console.log('');
    }

    console.log('\n🎉 测试邀请码生成完成！\n');
    console.log('📋 可用邀请码列表:');
    console.log('─'.repeat(60));

    const [allCodes] = await connection.execute(
      `SELECT code, description, maxUses, usedCount, grantTier, grantDays,
              DATE_FORMAT(expiresAt, '%Y-%m-%d') as expiresAt
       FROM invitationCodes
       WHERE isActive = 1
       ORDER BY createdAt DESC`
    );

    allCodes.forEach(code => {
      console.log(`\n🎫 ${code.code}`);
      console.log(`   ${code.description || '无描述'}`);
      console.log(`   使用: ${code.usedCount}/${code.maxUses || '∞'} | 等级: ${code.grantTier} | 有效期: ${code.expiresAt || '永久'}`);
    });

    console.log('\n' + '─'.repeat(60));
    console.log('\n💡 提示:');
    console.log('   - 访问 http://localhost:1060 测试注册功能');
    console.log('   - 登录后访问管理后台查看邀请码管理界面');
    console.log('');

  } catch (error) {
    console.error('❌ 生成邀请码失败:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('👋 数据库连接已关闭\n');
  }
}

// 执行
generateTestInvitationCodes().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});
