import { createServer } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { generateChart } from './lib/ziwei/algorithm.ts';
import { calculateTrueSolarTime, isValidGregorianDate, resolveZiweiDayOffset, shiftGregorianDate } from './lib/ziwei/true-solar-time.ts';
import { isChinaDST } from './lib/ziwei/dst-cn.ts';

const input = {
  year: z.number().int().min(1900).max(2100).describe('公历出生年'),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  clockHour: z.number().int().min(0).max(23).describe('出生地当地钟表时间，24 小时制'),
  clockMinute: z.number().int().min(0).max(59),
  gender: z.enum(['male', 'female']),
  city: z.string().optional(),
  longitude: z.number().min(-180).max(180).optional().describe('出生地东经为正；缺省时不校正真太阳时'),
  chinaDST: z.boolean().default(true).describe('中国境内出生且 1986 至 1991 年适用夏令时，则自动扣一小时'),
  lateZishi: z.enum(['next-day', 'current-day']).default('next-day'),
  leapMonth: z.enum(['split', 'next-month', 'prev-month', 'origin-month']).default('split'),
};

function makeServer() {
  const server = new McpServer({ name: 'ziwei-doushu-chart', version: '0.1.0' });
  server.registerTool('generate_ziwei_chart', {
    title: '使用开源引擎排紫微斗数命盘',
    description: '根据公历出生日期、当地时刻、性别及可选出生地经度，调用 Renhuai123/ziwei-doushu 的 generateChart 算法。返回十二宫、星曜、四化与大限等结构化结果。缺少性别、日期或确切时辰时先询问用户，不要猜测。',
    inputSchema: input,
  }, async (args) => {
    if (!isValidGregorianDate(args.year, args.month, args.day)) {
      return { isError: true, content: [{ type: 'text', text: '无效的公历日期' }] };
    }
    try {
      const dst = args.chinaDST && isChinaDST(args.year, args.month, args.day);
      const clock = args.clockHour * 60 + args.clockMinute - (dst ? 60 : 0);
      const adjustedDate = shiftGregorianDate(args, Math.floor(clock / 1440));
      const adjustedHour = Math.floor(((clock % 1440) + 1440) % 1440 / 60);
      const adjustedMinute = ((clock % 60) + 60) % 60;
      const solar = calculateTrueSolarTime({ ...adjustedDate, clockHour: adjustedHour, clockMinute: adjustedMinute, longitude: args.longitude });
      const date = shiftGregorianDate(adjustedDate, resolveZiweiDayOffset(solar, args.lateZishi));
      const chart = generateChart({ ...date, hour: solar.branch, gender: args.gender,
        city: args.city, longitude: args.longitude,
        origInput: { year: args.year, month: args.month, day: args.day, clockHour: args.clockHour, clockMinute: args.clockMinute },
      }, { leapMonth: args.leapMonth });
      const result = { source: 'https://github.com/Renhuai123/ziwei-doushu',
        sourceCommit: '9d98b3ae7fce298f751cb43c47783d6e84a7735d',
        applied: { chinaDST: dst, longitude: args.longitude ?? null, trueSolarTime: `${solar.hour}:${String(solar.minute).padStart(2, '0')}`, lateZishi: args.lateZishi, leapMonth: args.leapMonth },
        chart };
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
    }
  });
  return server;
}

const port = Number(process.env.PORT ?? 8787);
createServer(async (req, res) => {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path === '/' && req.method === 'GET') { res.writeHead(200).end('Ziwei MCP ready'); return; }
  if (path !== '/mcp' || !['POST', 'GET', 'DELETE'].includes(req.method ?? '')) { res.writeHead(404).end(); return; }
  const server = makeServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on('close', () => { void transport.close(); void server.close(); });
  try { await server.connect(transport); await transport.handleRequest(req, res); }
  catch (error) { console.error(error); if (!res.headersSent) res.writeHead(500).end('MCP error'); }
}).listen(port, () => console.log(`Ziwei MCP listening at http://localhost:${port}/mcp`));
