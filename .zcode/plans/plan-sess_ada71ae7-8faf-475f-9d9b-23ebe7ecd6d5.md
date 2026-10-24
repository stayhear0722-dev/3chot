# 3Chot 精选页优化:放宽质量门 + 清偿技术债 + 每日配额改版(修订版)

工作目录 `C:\Users\admin\Desktop\aihot`(线上 3chot.online 代码源)。在已批准四项决策(4 tab:全部/舆情/新品/行业;每板块每天 ≤5 条不设全天上限;门槛保持 ≥60 分;快讯 12→8;本次直接部署)基础上,新增两项用户指令:**质量门放宽**(新标准不要卡死,在证据锚定与旧宽松标准间取平衡)和**清偿遗留技术债**。

## 实施步骤

### 1. SSH 服务器诊断(只读,定放宽方向)
- `docker ps` 确认容器与 worker 状态(交接说"全站 worker 未启动"但日报/采集在更新,矛盾待证)。
- psql 只读查近 7 天:`analyses` 拒绝原因分布(below_minimum / evidence_gate / signal_gate / relevance_gate / no_increment / quality 版本)、score≥60 但被门拦的数量、`publications` selected 分布。
- 用数据定放宽方案,不拍脑袋。

### 2. 本地保护现场
`git add -A` checkpoint 提交另一个 AI 的 108 修改 + 90 新增文件,注明来源,再做任何改动。

### 3. 清偿技术债
- 修复全量测试 19 项失败(旧分析、历史报道、日报、微信测试)。
- 修复 `wechat-daily.test.ts` 引用不存在的 `accountName` 字段。
- 全量 `npm run typecheck` + 测试通过为止。

### 4. 放宽质量门(基于第 1 步数据)
- **60 分分数线不动**(用户两次确认)。
- 预期方向(按数据确认后执行):维度门从 evidence≥18/signal≥15/relevance≥12 适度下调(信源不足期的校准),或对 T1 一手信源放宽;评分 prompt 的证据锚定表述从"逐字引用必须"的强度回调到"可验证的具体事实"。
- 防幻觉的机械校验(引用必须出现在原文)保留——这是安全边界,不是卡点。
- 版本号升级(3c-signal-v3)让新校准生效且可回溯。

### 5. 板块整合 + 每日配额(原批准方案)
- 展示层聚合:全部 / 舆情(brand-voice) / 新品(product+competitor) / 行业(industry+opinion),移除"一手"tab,数据层 5 个 category key 不动。
- 读端配额:`/api/site/timeline` 按北京时间日 × 聚合板块 partition、score DESC 取 top 5;v1/RSS/MCP 公开契约不动。
- 首页快讯 12→8,精选空态文案说明"按分数每日限量、宁缺毋滥"。

### 6. 验证
typecheck、隔离测试库 `npm test`、web 构建+测试、本地起服务 smoke;为配额与聚合补测试。

### 7. 部署 3chot.online
- 新增 `deploy/selection-tabs-20261010.override.yml` 放链最后;按 baseline.json 完整 `-f` 链重启;备份 `/var/backups/3chot/`。
- 若诊断发现 worker 停摆,同次恢复。
- 线上 smoke + 核对 4 tab 配额行为、快讯 8 条、精选开始产出。

### 8. 收尾
更新记忆 `aihot-clone-project.md`(改版内容、override 链新增、质量门新校准值、诊断结论)。