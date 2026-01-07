import 'dotenv/config';
import { seedScenarios } from './server/seedScenarios';

seedScenarios(true)
  .then(() => {
    console.log('✅ 预设分类重置完成！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ 重置失败:', err);
    process.exit(1);
  });
