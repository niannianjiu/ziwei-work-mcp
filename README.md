# 紫微斗数排盘 MCP（ChatGPT Work）

此项目封装了 [Renhuai123/ziwei-doushu](https://github.com/Renhuai123/ziwei-doushu) 的 `generateChart()` 排盘算法，源代码快照为 `9d98b3ae7fce298f751cb43c47783d6e84a7735d`。工具返回原始结构化命盘；自然语言解读由 ChatGPT 根据命盘生成，并非原项目商业站的 AI 解读。

## 本地启动

需要 Node.js 20 或以上。进入解压后的目录执行：

```bash
npm install
npm run check
npm start
```

打开 `http://localhost:8787/` 可检查服务状态。MCP 地址是 `http://localhost:8787/mcp`。

## 接入网页版 ChatGPT Work

1. 将服务部署到**持续运行且可从互联网访问的 HTTPS 地址**。短期测试也可用 HTTPS 隧道映射本机的 8787 端口，但电脑或隧道停止后连接即失效。请给公开部署配置适当的访问控制；出生信息属于个人信息。
2. 在 ChatGPT 的 **设置 → 安全与登录** 中启用**开发者模式**。到 [插件](https://chatgpt.com/plugins) 页面添加 MCP 服务，填入 `https://你的域名/mcp`。名称可填“紫微斗数排盘”。
3. 新开 Work 对话，在 `@` 菜单中选择该插件，输入：“用排盘工具排盘：公历 1995 年 8 月 12 日 14:30，女，出生地西安。请列出十二宫和四化，并区分命盘数据与主观解读。”

提供出生城市时，最好提供准确经度。工具未获得经度时不进行真太阳时校正；有经度时按仓库的 `true-solar-time.ts` 计算。日期须为公历。1986–1991 年中国夏令时默认自动处理；非中国出生应将 `chinaDST` 设为 `false`。晚子时默认按次日，闰月默认按 `split`，可在工具参数中调整。

若需要“以后随时都能用”，应选择长期在线的 Node.js 托管服务和固定域名。此压缩包提供服务代码，不包含托管账号、域名或已安装的 Work 插件。

## 本地验证

```bash
curl -X POST http://localhost:8787/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  --data '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"generate_ziwei_chart","arguments":{"year":1995,"month":8,"day":12,"clockHour":14,"clockMinute":30,"gender":"female","longitude":108.9}}}'
```

原仓库代码遵循其 `LICENSE`；此封装也随附该许可。排盘仅供文化和娱乐参考，不宜用于健康、财务等重大决定。
