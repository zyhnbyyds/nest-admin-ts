你是一名资深的 Vue 3 + TypeScript 前端架构师，同时具备优秀的 UI/UX 审美。现在需要你在我的一个已有仓库里，从零搭建配套的 Web 管理端。

## 项目背景

- 后端仓库 `nest-admin-ts`（NestJS + Fastify + Drizzle ORM(MySQL) + Zod 校验，JWT 双 Token 鉴权 + RBAC 权限模型）已经开发完成，是一套通用后台管理系统，涵盖：用户/角色/菜单/部门/岗位/字典/参数配置管理、登录日志、操作日志、在线用户、定时任务、文件管理、代码生成器。
- 现在要在该仓库下新建的 `web/` 目录里实现对应前端，仓库其余部分不要动。
- 前端脚手架以 `https://github.com/zyhnbyyds/VueBase.git` 为模板。
- UI 组件库用 `lew-ui`（github.com/lewkamtao/lew-ui，本地已克隆在 `D:\project\github\lew-ui`，线上文档/demo：`https://app.tngeek.com/web/lew_ui/#/`），基于 Vue3 + TS，依赖 VueUse / Lucide 图标 / Day.js / Yup / Tippy.js / vue-virt-list，用法大致是 `import 'lew-ui/style'` 引入样式 + 按需具名导入组件（如 `import { LewButton } from 'lew-ui'`）。

## 开工前必须先确认（不要凭猜）

1. 打开 VueBase 模板仓库的真实源码，确认它现有的构建工具、TS 配置、状态管理方案、路由方案、lint/format 工具链，严格在它已有的基础上扩展，不要另起一套跟它冲突的脚手架。
2. 打开本地 lew-ui 仓库（或线上文档站），确认真实的组件清单、每个组件的 props/事件命名，以及主题定制用的变量命名——本提示词里的库背景信息只是给你上下文参考，不代表精确 API，一切以源码/文档为准。
3. 后端 Swagger 地址是开发环境的 `http://localhost:3000/api/v1/docs`，涉及具体某个接口的请求/响应字段时，先去确认真实 DTO 结构，不要臆造字段名。
4. 如果你暂时访问不到以上仓库/文档，先明确告诉我需要贴哪些文件内容，不要假装看过了就直接写代码。

## 后端 API 关键约定（已确认，可直接依据实现）

- 接口前缀 `/api/v1`，开发环境端口 3000；后端 CORS 默认放行 `http://localhost:5173`，也就是前端本地开发预期跑在 Vite 默认端口上——如果 VueBase 模板端口不是这个，记得同步改后端 CORS_ORIGINS 或前端 devServer 端口。
- 登录：`POST /auth/login`，成功返回 `{ accessToken, refreshToken, tokenType, expiresIn }`；此后所有请求带 `Authorization: Bearer <accessToken>`；登出要调 `POST /auth/logout` 让后端使 refreshToken 失效，不能只清前端状态。
- Access Token 默认 15 分钟过期，payload 里有 `sub`/`username`/`permissions[]`/`roles[]`；Refresh Token 默认 7 天，**每次使用后会轮换失效**——刷新逻辑必须做并发请求排队，不能让多个请求同时各自发起 refresh，否则后面的 refresh 会因为 token 已被消耗而失败。
- 权限字符串格式是 `模块:资源:操作`（如 `system:user:list`），超级管理员是通配符 `*:*:*`。
- 分页统一约定：请求带 `{ page, pageSize }`，响应统一是 `{ items, page, pageSize }`。
- 目前看不到全局响应拦截器做 `{ code, data, message }` 外层包裹的迹象，大概率 Controller 返回什么前端就拿到什么——但请以 Swagger 实际返回结构为准，不要凭空套一层壳类型。
- 菜单（`sys_menu`）用 `type` 区分 `M`(目录)/`C`(菜单)/`F`(按钮)，`permission` 字段是权限标识；菜单模块带"路由树"能力（具体接口路径去 Swagger 确认），前端登录后要用这棵树动态生成侧边栏菜单 + 动态路由，`F` 类型不生成路由，只用来做按钮级权限判断。

## 需要覆盖的页面/模块（与后端模块一一对应）

登录页、Dashboard 首页、用户管理、角色管理（含分配菜单权限）、菜单管理（树形，拖拽排序更佳）、部门管理（树形）、岗位管理、字典管理（字典类型+字典数据两级联动）、参数配置、登录日志、操作日志、在线用户（含强制下线）、定时任务（含手动执行+执行日志）、文件管理、个人中心（资料+改密码）。代码生成器可以做成低优先级/可选页面。

这套功能形态和「若依 RuoYi」「vue-vben-admin」这类国内常见中后台脚手架高度相似，菜单驱动路由、字典管理、操作日志这些点的实现思路可以适当参考它们，但视觉风格仍按 lew-ui + 下面的质感要求来，不要照抄它们的 UI。

每个业务模块基本形态：搜索+分页表格 → 新增/编辑用弹窗或抽屉表单 → 删除要二次确认；树形模块（菜单/部门）用树形控件展示，数据量不大可以一次性拉全量。

## 目录结构

在 `web/src` 下按以下分层组织（可以在 VueBase 已有惯例基础上微调命名，但分层思路不要变）：

api/ 按后端模块一一对应封装请求，组件里禁止直接写 axios
request.ts axios 实例 + 拦截器(token 注入/刷新排队/统一报错提示)
system/ monitor/ ... 对应各业务模块
router/ 动态路由 + 权限守卫
store/ Pinia：user(token/用户信息/权限)、permission(动态路由生成)、settings(主题/暗色/布局偏好)
layouts/ 侧边栏+顶栏+多标签页的整体外壳
views/ 与后端模块对齐的页面
components/ 通用业务组件(表格/搜索栏/树选择器等)
directives/ v-permission 按钮级权限指令
composables/ useTable、useDict 等复用逻辑
styles/ 唯一的设计 token 源(变量) + 暗色模式覆盖
types/ 和后端 DTO 对应的 TS 类型

## API 封装与鉴权要求

- 统一 axios 实例，baseURL 从环境变量读取（区分 dev/prod）。
- 请求拦截器自动注入 token；响应拦截器统一处理业务报错（用 lew-ui 的消息提示组件）和 401（触发刷新，刷新期间的其它请求要挂起排队，刷新成功后重放，失败则清空登录态跳转登录页）。
- accessToken 建议存内存态(Pinia，不持久化)，refreshToken 存 localStorage（后端是把它放在 body 里返回而非 httpOnly cookie，前端没有更安全的存放方式，这个取舍可以跟我说一下但不必纠结太久）。
- 所有接口的请求参数、返回值都要有对应 TS 类型，禁止大量 any。

## 权限与动态路由

- 登录成功后拉当前用户的菜单树 + 权限列表，转换成 vue-router 的动态路由并 addRoute，同时生成侧边栏数据。
- 写一个 v-permission 指令，接收权限字符串，没有对应权限的按钮直接不渲染（不是禁用置灰）。
- 路由守卫处理：未登录跳登录页、无权限跳 403、404 兜底。

## 暗色模式与主题定制

- 用 lew-ui 已经依赖的 @vueuse/core 的 useDark/useColorMode 做暗色模式切换，不要自己重复造轮子。
- 浅色、深色、自定义主题色三者必须共用同一套 CSS 变量体系，全项目只保留一个 token 入口文件，不要出现两套色阶体系并存、互相打架的情况。
- 主题状态(深色/浅色/跟随系统 + 自定义主色调)要持久化到 localStorage，刷新页面后保持。
- 做一个主题设置面板（抽屉或弹层），可以切换模式和自定义主色调，实时生效。

## 视觉质感要求（做出"高大上"的感觉，不要脚手架既视感）

- 大量留白、克制的配色（主题色 + 中性灰阶为主），信息层级用字号/字重拉开，不要整页一个字号。
- 卡片/表格用细边框或极浅阴影，不要重边框；圆角、间距全局统一一套规范，不要每个组件各写各的。
- 路由切换、菜单展开收起、抽屉弹出等要有顺滑但不拖沓的过渡动画。
- Dashboard 首页可以引入图表库（如 ECharts）做数据可视化，让首页有内容感而不是空壳。
- 暗色模式不是简单反色，需要专门调整对比度、阴影和图表配色，避免刺眼。

## 代码规范

- Vue3 `<script setup lang="ts">` + Composition API，不用 Options API。
- 严格 TypeScript，命名/格式化规则跟随 VueBase 模板已有配置，不要引入跟它冲突的另一套规则。
- 组件、状态、路由三者职责分离，页面组件只做编排，业务逻辑下沉到 composables 或 store。

## 交付方式

先给出确认后的目录树和技术选型说明，再按模块分批实现（先做登录/整体布局/权限体系这些基础设施，再做各业务模块），每次给的都是完整、可以直接跑起来的代码，不要用省略号或 TODO 占位。遇到本提示词没覆盖、但会显著影响实现方式的问题，先简单问我或者列出你的假设，不要硬着头皮瞎猜。
