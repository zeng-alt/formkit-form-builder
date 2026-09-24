# DSL 参考

面向后端对接（例如用 Java 反序列化并存储 `FormDefinition`，或自行实现表达式求值）的完整字段说明。
以 `src/types/dsl.ts` 为准；本文所有说法都对照代码核实过，行为有出入以代码为准。

英文版：[dsl.en.md](./dsl.en.md)。库使用方式（安装、组件 API）见仓库根目录的 [README.md](../README.md) / [README-zh.md](../README-zh.md)。

## 目录

- [顶层结构：FormDefinition](#顶层结构formdefinition)
- [FormSettings](#formsettings)
- [节点公共字段：BaseNode](#节点公共字段basenode)
- [四类节点](#四类节点)
- [字段节点专属字段](#字段节点专属字段)
- [表达式 AST](#表达式-ast)
- [事件绑定](#事件绑定)
- [容器的数据结构](#容器的数据结构)
- [toPortableDefinition：剥离前端专用字段](#toportabledefinition剥离前端专用字段)
- [完整示例](#完整示例)
- [与代码的对应关系](#与代码的对应关系)

## 顶层结构：FormDefinition

```ts
interface FormDefinition {
  version: number
  id: string
  name: string
  description?: string
  root: ContainerNode // 表单树根节点：必须是容器，字段只能挂在容器/布局内
  settings: FormSettings
  meta?: Record<string, unknown> // 任意业务元数据，原样透传
}
```

- `version`：DSL 版本号，来自 `DSL_VERSION`（当前为 `1`）。库内部目前没有跨版本迁移逻辑——
  `schemaToDsl` 解析裸 schema 时会尝试读回原始 `version`（找不到则用当前 `DSL_VERSION` 兜底），
  但不会对旧版本结构做字段级迁移；升级 `DSL_VERSION` 前如果 DSL 结构发生不兼容变化，需要后端
  自行处理旧数据的兼容读取。
- `id` / `name` / `description`：表单的标识、名称、描述，纯数据，库不做唯一性校验。
- `root`：根节点固定是一个 `type: 'group'` 的容器节点（`category: 'container'`，
  `dataType: 'object'`），根节点自身不产出数据 key，`root.children` 才是表单里真正拖入的元素。
- `settings`：表单级设置，见下节。
- `meta`：任意 JSON，后端可以用来存自己的业务字段（如审批流配置），库本身不读取它。

## FormSettings

```ts
interface FormSettings {
  labelAlign?: 'top' | 'left'
  labelWidth?: number
  submit?: string
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
  readonly?: boolean
  successMessage?: string
  successRedirect?: string
  showReset?: boolean
  submitText?: string
  resetText?: string
}
```

| 字段                       | 含义                                                                                                                                                                                | 默认值                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `labelAlign`               | 标签位置                                                                                                                                                                            | 未设置按 `'top'` 处理（只有显式 `'left'` 才是左侧标签；`schemaToDsl` 只识别 `'top'`/`'left'` 两个值） |
| `labelWidth`               | 标签宽度（`labelAlign: 'left'` 时生效，单位 px）                                                                                                                                    | `80`（`DEFAULT_LABEL_WIDTH`）                                                                         |
| `submit`                   | 自定义提交逻辑：一段 JS 函数体字符串，设置后 `FormRenderer` 提交时执行它而不是直接触发 `submit` 事件（见「事件绑定」一节的执行环境）                                                | 未设置                                                                                                |
| `size`                     | 全表控件尺寸；字段自身未显式设置尺寸（或仍是元素目录里的基线默认值 `'medium'`）时才回落到这里                                                                                       | 未设置（各控件走自己的默认尺寸，通常是 `medium`）                                                     |
| `disabled`                 | 整表禁用：与字段自身 `disabled` / 字段级 `disabledIf` 是"任一为真即禁用"的关系                                                                                                      | `false`                                                                                               |
| `readonly`                 | 整表只读：只有原生支持只读语义的字段类型（`text`/`email`/`url`/`tel`/`password`/`textarea`/`number`）会真正只读，其余类型没有只读语义，统一退化为禁用                               | `false`                                                                                               |
| `successMessage`           | 提交成功后的提示文案（naive-ui message）；为空则不提示                                                                                                                              | 未设置                                                                                                |
| `successRedirect`          | 提交成功后跳转的地址；只允许 `http`/`https` 绝对地址，或以 `/` 开头的站内路径（其余一律视为不安全，不会跳转，用来防 `javascript:` 等危险协议）                                      | 未设置                                                                                                |
| `showReset`                | 是否显示默认操作区的重置按钮（只有值严格等于 `false` 才隐藏）                                                                                                                       | `true`                                                                                                |
| `submitText` / `resetText` | 默认操作区的提交/重置按钮文案；解析优先级为 `settings.submitText/resetText` > `FormRenderer` 的 `submitLabel`/`resetLabel` prop > 内置 i18n 文案（`提交`/`重置`、`Submit`/`Reset`） | 未设置                                                                                                |

## 节点公共字段：BaseNode

四类节点（`FieldNode` / `ContainerNode` / `LayoutNode` / `StaticNode`）都继承以下公共字段：

```ts
interface BaseNode {
  id: string
  key?: string
  name?: string
  label?: string
  type: string
  category: 'field' | 'container' | 'layout' | 'static'
  renderAs: 'formkit' | 'cmp' | 'el'
  target?: string
  props?: Record<string, unknown>
  visibleIf?: Expr
  outerClass?: string
  events?: EventBinding[]
  meta?: Record<string, unknown>
}
```

- `id`：稳定唯一 id，前端生成，用于树操作 / 选中 / 绑定，后端只需原样保留、不必解析。
- `key`：画布拖放身份标识（对应旧 schema 的 `__key`），**纯前端概念**，交给后端前用
  `toPortableDefinition()` 剥离（见下文）。非画布场景（如后端手写 DSL）可以不填。
- `name`：字段名，即提交给后端的数据 key；容器 / 布局 / 静态节点大多数情况下不需要填
  （group / list / tabs / steps 等有自己数据结构的容器例外，见「容器的数据结构」）。
- `type`：组件类型标识，取值见 `src/elements/definitions/*.ts` 的元素目录（如 `text`、
  `select`、`group`、`list`、`card`、`tabs`……），或 `LayoutType` 里的 `grid`/`row`/`column`。
- `category`：语义分类，四选一，决定该节点走哪套字段（field 才有 `value`/`validation` 等）。
- `renderAs`：渲染原语，决定这个节点最终编译成 FormKit schema 的哪种节点：
  - `'formkit'` → `$formkit: <type>`（原生 FormKit 输入，目前只有 `group` 走这条）；
  - `'cmp'` → `$cmp: <target ?? type>`（绝大多数元素，含所有字段和容器/布局）；
  - `'el'` → `$el: <target ?? type>`（原生 HTML 标签，如内置的 `grid`/`row`/`column` 布局输出
    `$el: 'div'`，tabsPane/stepsPane 内部标记节点也用 `renderAs: 'el'`）。
- `target`：渲染目标名，仅当与 `type` 不同名时才需要（例如 `email` 字段 `type` 是
  `email`，但 `$cmp` 组件名是 `NaiveEmailInput`）；`'formkit'` 原语时缺省即 `type` 本身。
- `props`：该 type 的专有配置（如 `text` 的 `placeholder`、`select` 的 `filterable`），
  透传到组件的 props（`renderAs:'cmp'`）或 attrs（`renderAs:'el'`）。
- `visibleIf`：条件显示的表达式 AST，见「表达式 AST」；为 `undefined` 表示恒可见。
- `outerClass`：**宽度的唯一来源**。画布是一个 12 列网格（`grid-cols-12`），节点占几列
  就靠这个字符串里的 `col-span-N`（可选叠加 `row-span-N` 及任意其他类名）；不写或写
  `'col-span-12'` 都视为占满整行（往返时 `'col-span-12'` 不会被序列化进 `outerClass`，
  保持数据干净）。
- `events`：事件绑定数组，见「事件绑定」。
- `meta`：任意业务元数据，后端原样透传即可；唯一的例外是 `meta.rawSchema`——那是
  `schemaToDsl` 对无法识别的类型做的无损兜底（保留原始 schema 节点保证前端不至于渲染
  崩溃），同样是纯前端字段，交给后端前应剥离。

## 四类节点

```ts
interface FieldNode extends BaseNode {
  category: 'field'
  value?: unknown
  expr?: string
  requiredIf?: Expr
  disabledIf?: Expr
  readonlyIf?: Expr
  validation?: ValidationRule[]
  options?: OptionItem[] | { dynamic: true; code: string; label?: string }
}

interface ContainerNode extends BaseNode {
  category: 'container'
  dataType?: 'object' | 'array'
  children: FormNode[]
}

type LayoutType = 'grid' | 'row' | 'column' | 'card' | 'tabs' | 'tabsPane' | 'steps' | 'stepsPane'
interface LayoutNode extends BaseNode {
  category: 'layout'
  type: LayoutType
  children: FormNode[]
}

interface StaticNode extends BaseNode {
  category: 'static'
  text?: string
  src?: string
}
```

- **FieldNode**：唯一会产出表单数据 key 的节点（依据 `name`）。各字段专属键见下一节。
- **ContainerNode**：有数据结构的容器（`group`/`list`/`inputGroup`/`buttonGroup`/`badge`/
  `dataTable`/`collapse`，也含扩展元素注册的自定义容器）。`dataType` 由容器规格推出：
  `'object'`（单对象，如 `group`）或 `'array'`（数组，如 `list`；`buttonGroup`/`badge`/
  `dataTable` 这类没有真正"多子项数组"语义的容器也会落在 `'array'`，这只是规格映射的
  副产物，不代表它们真的产出数组数据——具体请看下面「容器的数据结构」表格）。
- **LayoutNode**：纯布局节点，本身不产出数据 key。`grid`/`row`/`column` 是不带容器规格的
  普通 `$el: div` 布局（分别是 CSS grid / flex-row / flex-col 容器）；`card`/`tabs`/`steps`
  是有容器规格的布局（`card` 单对象，`tabs`/`steps` 见下节）；`tabsPane`/`stepsPane` 是
  `tabs`/`steps` 内部的页签/步骤节点，本身没有渲染原语，只携带 `__key`/`__paneType` 标记
  和 `children`。
- **StaticNode**：纯展示节点（文本、标题、按钮、分割线、图片等），不产出表单数据；
  `text` 是文案/标题内容，`src` 是图片地址，其余展示属性（颜色、大小等）走 `props`。

## 字段节点专属字段

- `value`：初始值，JSON 任意类型，随 `dslToSchema` 写进 schema 节点的 `value`。
- `expr`：表达式字符串（如 `"$price * $count"`），运行时会 watch 依赖字段并把求值结果
  写入该字段对应的 FormKit 节点——用于"合计/计算字段"这类场景。写法见下节「表达式 AST」
  的「可读源码」部分（与 `visibleIf` 等共用同一套语法解析器）。
- `validation`：结构化校验规则数组，见下方「校验规则」。
- `options`：选项来源，二选一：
  - 静态数组 `OptionItem[]`：`{ label, value, disabled?, children? }`（`children` 用于级联/
    树选择的多级选项，其余任意附加键原样保留）；
  - 动态字典 `{ dynamic: true, code, label? }`：运行时通过宿主传入的
    `config.fetchDictionary(code)` 拉取 `[{ label, value }]`，用于下拉/单选/多选/级联/
    树选择字段。只有这几类可选择型字段支持动态字典，具体见
    `src/components/ui/fields/Naive{Select,CheckboxGroup,RadioGroup,Transfer}.vue`。
- `requiredIf` / `disabledIf` / `readonlyIf`：条件必填 / 条件禁用 / 条件只读，值都是「表达式
  AST」，语义如下（对照 `src/components/ui/formkit/use-schema-attrs.ts` 逐条核实）：
  - **条件必填 `requiredIf`**：为真时等价于给该字段临时加一条 `required` 校验规则。
    **字段已经有静态 `required` 规则时静态规则优先**——两个分支（条件为真/为假）都会
    含 `required`，条件必填因此不再产生任何区别（编辑面板会据此给出提示）。
  - **条件禁用 `disabledIf`**：为真时禁用该字段，与「表单级 `settings.disabled`」「字段
    自身静态 `disabled`」是**任一为真即禁用**的叠加关系，不是互斥选择。
  - **条件只读 `readonlyIf`**：为真时，只有原生支持只读语义的字段类型
    （`text`/`email`/`url`/`tel`/`password`/`textarea`/`number`）会渲染成真正的只读（值可见、
    不可编辑）；其余类型没有只读语义，统一**退化为禁用**，判断口径与「表单级
    `settings.readonly`」共用同一份类型集合，不另起一套规则。
  - 三者与表单级 `disabled`/`readonly`、字段静态 `disabled` 的最终关系是一次性 OR：
    `disabled = 字段静态disabled || 表单级disabled || (表单级readonly 且类型不支持只读) ||
disabledIf为真 || (readonlyIf为真 且类型不支持只读)`。

### 校验规则

```ts
interface ValidationRule {
  rule: string
  args?: unknown[]
  message?: string
  debounce?: number // 防抖毫秒数，对应 FormKit 规则前缀 (200)
  empty?: boolean // 对应前缀 +：空值也执行这条规则
  force?: boolean // 对应前缀 *：前置规则失败时也强制执行
  optional?: boolean // 对应前缀 ?：非阻塞，校验不过表单仍可提交
}
```

`dslToSchema` 把 `ValidationRule[]` 编译成 FormKit 原生的验证数组语法
`[["<修饰符前缀><rule>", ...args], ...]`（修饰符按 `(debounce)` → `+` → `*` → `?` 的顺序拼在
规则名前面），并把带 `message` 的规则收进 `validation-messages: { <rule>: <message> }`；
`schemaToDsl` 是它的逆操作。存在 `requiredIf` 时，`validation` 会被编译成 FormKit 的条件属性
`{ if, then, else }`（`if` 是 `requiredIf` 编译出的表达式，`then` 分支比 `else` 分支多一条
`required`），`schemaToDsl` 同样能把它还原回 `requiredIf` + 静态 `validation`。

内置规则名清单（取自 `src/components/sidebar-right/validations/ValidationSection.vue`，
是编辑面板里实际提供的规则，均为 FormKit/Formwork 标准校验规则名，含义与 FormKit 官方文档
一致）：

- 无参数：`accepted`、`required`、`email`、`number`、`lowercase`、`uppercase`、`url`、
  `alpha`、`alpha_spaces`、`alphanumeric`、`symbol`、`contains_alpha`、
  `contains_alphanumeric`、`contains_alpha_spaces`、`contains_symbol`、
  `contains_uppercase`、`contains_lowercase`、`contains_numeric`
- 单参数：`confirm`（确认字段名）、`min`、`max`、`matches`（正则）、`starts_with`、
  `ends_with`、`date_after`、`date_before`、`date_format`、`is`（枚举值列表）、`not`（排除值
  列表）、`require_one`（同组任一必填，参数为关联字段名列表）
- 双参数：`date_between`（起止日期）、`length`（最小/最大长度）、`between`（最小/最大值）

每条规则是否适用取决于所在字段的 `type`（如 `accepted` 只用于 `checkbox`），完整的
字段类型 ↔ 规则映射见 `ValidationSection.vue` 里的 `showForFieldType`，此处不重复列出——
后端如果要做二次校验，直接照抄前端选中的 `rule`/`args` 语义即可，不需要关心这层"编辑器
里对哪些字段可见"的 UI 限制。

## 表达式 AST

`Expr` 是可移植（JSON-safe）的表达式语法树，Java 等后端可以直接解析或生成：

```ts
type Expr =
  | { type: 'literal'; value: any }
  | { type: 'field'; name: string } // 引用表单数据里的字段名
  | { type: 'call'; fn: string; args: Expr[] } // 内置函数调用
```

`visibleIf` / `requiredIf` / `disabledIf` / `readonlyIf` 都是 `Expr`；`expr`（表达式值字段）
是**字符串**形式（见下方「可读源码」），运行时会解析成同一棵 AST 再求值，两者语义完全一致。

### 内置函数清单

取自 `src/dsl/expr-builtins.ts`，是前后端共用的函数名单一来源——Java 侧只要实现同名语义
即可对齐，不需要读 JS 源码。

| 函数                          | 参数个数 | 参数                 | 返回    | 说明                                                                                                        |
| ----------------------------- | -------- | -------------------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| `and`                         | 1..∞     | 任意                 | boolean | 全部为真（JS 真值语义）才为真                                                                               |
| `or`                          | 1..∞     | 任意                 | boolean | 任一为真即为真                                                                                              |
| `not`                         | 1        | 任意                 | boolean | 逻辑取反                                                                                                    |
| `eq`                          | 2        | a, b                 | boolean | 见下方「eq 语义表」                                                                                         |
| `neq`                         | 2        | a, b                 | boolean | `eq` 取反                                                                                                   |
| `gt` / `gte` / `lt` / `lte`   | 2        | a, b                 | boolean | 数值比较；两边都能转成有限数字时按数值比较，否则按字符串比较（`String(a ?? '')` vs `String(b ?? '')`）      |
| `contains`                    | 2        | a, b                 | boolean | `String(a).includes(String(b))`                                                                             |
| `notContains`                 | 2        | a, b                 | boolean | `contains` 取反                                                                                             |
| `empty`                       | 1        | a                    | boolean | `a === null \|\| a === undefined \|\| a === ''`                                                             |
| `notEmpty`                    | 1        | a                    | boolean | `empty` 取反                                                                                                |
| `add`                         | 2        | a, b                 | any     | 任一边是字符串则做字符串拼接，否则数值相加（非数字/非字符串按 `toNum` 规则转数字，`null`/`undefined` 记 0） |
| `sub` / `mul` / `div` / `mod` | 2        | a, b                 | number  | 数值运算，参数按 `toNum` 规则转数字                                                                         |
| `concat`                      | 1..∞     | 任意                 | string  | 全部转字符串后拼接                                                                                          |
| `lower` / `upper` / `trim`    | 1        | a                    | string  | 转小写 / 转大写 / 去首尾空白                                                                                |
| `length`                      | 1        | a                    | number  | `String(a ?? '').length`                                                                                    |
| `coalesce`                    | 2        | a, b                 | any     | a 为 `null`/`undefined` 时取 b，否则取 a                                                                    |
| `if`                          | 3        | test, 真分支, 假分支 | any     | 三元条件                                                                                                    |
| `sum`                         | 1..∞     | 任意                 | number  | 全部按 `toNum` 转数字后求和                                                                                 |
| `today`                       | 0        | 无                   | string  | 当前日期 `yyyy-MM-dd`，按当前设置的求值语言解析时区（见「i18n 覆写」/`setExprLocale`），不是固定 UTC        |
| `uuid`                        | 0        | 无                   | string  | 伪 UUID v4（`Math.random` 生成，非密码学安全）                                                              |
| `__raw__`                     | 1        | 原始字符串字面量     | any     | 内部兜底：`parseExprString` 解析失败时把原始字符串包成这个节点，保证往返不丢数据；不建议后端主动生成        |

`toNum` 规则：数字原样返回；字符串非空时 `Number(str)`（空字符串记 0）；`null`/`undefined`
记 0；布尔值 `true`→1、`false`→0；其余走 `Number(v)`。

**`eq(a, b)` 语义表**（`neq` 是它的取反，不单独定义；专门设计成不依赖 JS 的 `==` 隐式转换，
方便 Java 等后端独立实现出一致结果）：

1. 两边都是 `null`/`undefined` → `true`；只有一边是 → `false`
2. 两边都是布尔值 → 严格相等
3. 两边都是数字 → 严格相等（`NaN` 与任何值都不等，包括它自身）
4. 一边是数字、另一边是纯数字字符串（正则 `^-?\d+(\.\d+)?$`，不接受十六进制/科学计数法/
   前后空白）→ 按数值比较
5. 两边都是字符串 → 严格相等
6. 其余组合（如布尔值对数字、数组/对象参与比较）→ `false`

### 可读源码写法

面板里 `visibleIf` 等表达式以人类可读的源码形式展示/编辑（如
`$hasOtherIncome == true`），而不是直接展示 AST 或编译后的 helper 调用；`expr` 字段本身也是
这种源码字符串。语法（`src/dsl/convert/expr-parse.ts` 手写递归下降解析器，
`src/dsl/expr-source.ts` 是其逆过程）：

- **字段引用**：`$字段名`（如 `$age`、`$user_name`）。
- **字符串字面量**：英文引号 `"..."`/`'...'`，以及中文输入法常打出的弯引号
  `“...”`/`‘...’`（开闭引号必须配对），支持反斜杠转义。
- **数字 / 布尔 / null 字面量**：`123`、`1.5`、`true`、`false`、`null`。
- **运算符**（优先级从低到高）：三元 `test ? 真值 : 假值` → `||` → `&&` → `==`/`!=`
  （`===`/`!==` 也接受，语义与 `==`/`!=` 相同，都编译为 `eq`/`neq`）→ `> >= < <=` →
  `+ -` → `* / %` → 一元 `!`（逻辑非）和一元 `-`（数值取负，内部编译成 `sub(0, x)`）→
  括号 `(...)`。
- **函数调用**：内置函数清单里的任意函数都可以按普通调用写法使用，如
  `contains($a, "x")`、`empty($b)`、`today()`、`if($a > 0, "正", "负")`。

几个例子（源码 → 对应 AST 概念，均可直接粘进 `visibleIf`/`requiredIf` 等的编辑框）：

```text
$hasOtherIncome == true                     # eq(field(hasOtherIncome), true)
$age >= 18 && !empty($name)                 # and(gte(field(age), 18), not(empty(field(name))))
$status == "已通过" || $status == "已拒绝"    # or(eq(field(status), "已通过"), eq(field(status), "已拒绝"))
$score >= 60 ? "及格" : "不及格"              # if(gte(field(score), 60), "及格", "不及格")
$price * $count                              # mul(field(price), field(count))，多用于字段的 expr
```

### 编译到 FormKit schema：为什么是 helper 调用

`dslToSchema` 把 `visibleIf` 编译成 schema 的 `if` 字符串（FormKit 渲染时求值），把内置函数
统一编译成 `$fkb_<fn>(arg1, arg2, ...)` 形式的 helper 调用（前缀常量
`EXPR_HELPER_PREFIX = 'fkb_'`），而不是翻译成 FormKit 自带的原生运算符——FormKit v2 schema
的 `if` 由 `@formkit/core` 内置的一个手写迷你表达式解析器执行，只认
`&& || === !== == != >= <= > < + - * / %` 和 `$token(args)` 调用语法，没有三元 `?:`、没有
`??`、没有一元 `!`；把每个内置函数拆成"看似等价"的原生算子曾经是真实的 bug 来源（`not`
被解释反、`if`/`coalesce` 返回 `undefined`、`contains` 返回子串而非布尔值）。改成 helper
调用后，schema 的 `if` 条件与 `evalExpr`（`expr` 字段求值、设计器实时预览用）跑的是同一份
`src/dsl/expr-builtins.ts` 实现，三处语义（画布预览、FormKit 运行时渲染、后端按 `Expr` AST
自行求值）天然一致，不需要逐个函数手动核对。

**后端只需要关心 `Expr` AST 本身**（`visibleIf`/`requiredIf`/`disabledIf`/`readonlyIf` 存的都
是 AST，不是编译后的 `$fkb_xxx` 字符串），按上表实现同名函数即可独立求值，不需要理解
`$fkb_` 编译细节。**唯一需要注意的保留前缀**：`fkb_` 是这套 helper 的保留 token 前缀，
**字段名不能以 `fkb_` 开头**，否则会被同名 helper 函数遮蔽，导致条件显示等逻辑静默失效。

## 事件绑定

```ts
const FORM_EVENTS = ['click', 'change', 'input', 'focus', 'blur'] as const
interface EventBinding {
  event: (typeof FORM_EVENTS)[number]
  handler: string // 不透明的函数体字符串
}
```

节点的 `events: [{ event: "click", handler: "..." }]` 是事件绑定的唯一真源。`handler` 是一段
**函数体字符串**（不是完整函数声明），由前端运行时用 `new Function(...)` 执行——Java 等后端
只需要原样存储、原样透传，不需要解析它。`dslToSchema` 把 `events` 编译成 schema 侧统一的
`__bind: { onClick: handler, ... }`（`formkit` 节点在顶层，`cmp` 节点在 `props`，`el` 节点在
`attrs`）。

运行时执行 `handler` 时会注入以下命名参数，代码里可以直接引用（见
`src/utils/bind-runtime.ts`）：

| 参数         | 含义                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `event`      | 触发事件的原始事件对象                                                                             |
| `form`       | 当前表单数据（点击/输入等字段事件下等价 `ctx.form`；`settings.submit` 执行时是即将提交的表单数据） |
| `$form`      | 表单定义元信息 `{ id, version, name }`，来自 DSL 顶层字段，不是 FormKit 节点属性                   |
| `$value`     | 当前节点的值                                                                                       |
| `$node`      | 当前节点的 FormKit 节点实例                                                                        |
| `$name`      | 当前节点的字段名（即 `$node.name`）                                                                |
| `$get(name)` | 按字段名取表单里任意字段的当前值                                                                   |
| `$slots`     | 当前节点的插槽                                                                                     |
| `attrs`      | 当前节点的全部配置                                                                                 |
| `ctx`        | 以上参数的合并对象，高级用途                                                                       |
| `axios`      | HTTP 请求库实例（`FormRenderer` 的 `http` prop 或 `config.http`，缺省内置 `axios`）                |

`settings.submit`（自定义提交逻辑）复用同一套执行器，但没有真实的 FormKit 节点上下文：
只有 `form`（即将提交的数据）、`$form`、`axios` 有意义，`$value`/`$node`/`$name`/`$get`/
`$slots` 均为 `undefined`。

数据表格容器（`dataTable`）的 `getData`/`createData`/`updateData`/`deleteData` 远程数据钩子
也是同类的不透明 JS 字符串（存在节点 `props` 里，不属于 `EventBinding` 结构），同样经运行时
执行、可以访问注入的 `axios` 实例——安全含义与事件绑定一致，见 README「安全说明」一节。

## 容器的数据结构

容器/布局节点的数据结构由 `src/elements/container-spec.ts` 的规格表驱动：

| type          | dataShape（规格） | ContainerNode.dataType | 说明                                                                                                                  |
| ------------- | ----------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `group`       | `object`          | `object`               | 原生 FormKit `$formkit: 'group'`，任何模式下都会把 `children` 的数据嵌套成一个以 `name` 为 key 的对象                 |
| `list`        | `array`           | `array`                | 数组容器：条目是标量（`["a","b"]`）、单个 group 子节点时是扁平对象数组（`[{...}]`），或再嵌一层 `list` 时是数组的数组 |
| `card`        | `object`          | `object`               | 纯视觉容器（带边框/标题的卡片），不是原生 group                                                                       |
| `inputGroup`  | `object`          | `object`               | 纯视觉容器（横向紧凑排列的输入组），不是原生 group                                                                    |
| `buttonGroup` | `none`            | `array`\*              | 纯展示壳，只装按钮，没有自己的数据                                                                                    |
| `badge`       | `none`            | `array`\*              | 纯展示壳（角标），没有自己的数据                                                                                      |
| `tabs`        | `objectOfObjects` | `array`\*              | 每个页签（pane）内容固定预置一个 group 子节点，页签之间各自是独立对象                                                 |
| `steps`       | `objectOfObjects` | `array`\*              | 同 `tabs`，每一步固定预置一个 group 子节点                                                                            |
| `dataTable`   | `none`            | `array`\*              | 无 DnD 子节点，列/数据在 `props` 里配置（见组件自身文档/源码），不遵循下面的 flat/nested 规则                         |
| `collapse`    | `object`          | `object`               | 折叠面板，纯视觉容器，数据结构与 `card` 相同                                                                          |

\* `dataType` 由规格表统一映射（`dataShape==='object'` → `'object'`，其余（含 `'none'`）→
`'array'`），`'array'` 不代表这些容器真的产出数组数据——`buttonGroup`/`badge` 根本没有数据，
`tabs`/`steps` 的每个 pane 实际是独立对象，这只是规格映射的副产物，不是数据形状的直接体现。

### `dataStructure: 'flat' | 'nested'` 如何改变提交出的 JSON

`FormRenderer` 的 `dataStructure` prop（默认 `'flat'`）对应 `dslToSchema`（flat）和
`dslToOutputSchema`（nested）两个转换函数，区别只在于**非 group 的容器/布局节点是否被
包一层 `$formkit: group`**：

- **`flat`（默认）**：`card`/`inputGroup`/`buttonGroup`/`badge`/`tabs`/`steps`/`dataTable`/
  `collapse` 等纯视觉容器不产生任何数据嵌套，里面字段的 `name` 直接铺在表单数据顶层，
  与容器结构完全脱钩。**因此跨容器引用字段（`visibleIf`/`expr` 等）时，字段名建议保持
  全局唯一**——重名时按名字查找会取第一个命中的字段。`list`（数组容器）和 `group`
  （原生 group）不受此影响，天然产出各自的数组/对象数据。
- **`nested`**：除 `group` 外，其余会产出数据的容器/布局节点（`card`/`inputGroup`/
  `buttonGroup`\*/`tabs`/`steps`/`dataTable`/`collapse` 等）会被整体包进一个
  `$formkit: 'group'`，组名就是该容器节点自己的 `name`，于是它的子字段会嵌套成一个以该
  `name` 为 key 的对象。`tabs`/`steps` 内部本来就固定预置了 group（见上表），因此嵌套结构
  在 flat/nested 两种模式下是一致的（多一层由 tabs/steps 自身名字决定的外层 group）。

  \* `buttonGroup`/`badge` 内部没有可产出数据的字段（只有按钮），包不包 group 对提交数据
  没有实际影响。

举例：`card`（`name: 'contact'`，内部一个 `text` 字段 `name: 'phone'`）：

```jsonc
// flat（默认）：phone 直接在顶层
{ "phone": "13800000000" }

// nested：phone 嵌套在 contact 对象里
{ "contact": { "phone": "13800000000" } }
```

字段引用（`visibleIf`/`expr` 等）按字段名在**整棵表单数据树**里查找，不管 flat 还是
nested 都能找到同名字段，所以条件显示这类逻辑在两种模式下表现一致；`flat`/`nested`
只影响提交给后端的 JSON 长什么样。

## `toPortableDefinition()`：剥离前端专用字段

```ts
function toPortableDefinition(def: FormDefinition): FormDefinition
```

深拷贝 `def`，递归剥离所有节点上的两个纯前端字段，其余字段原样保留：

- `BaseNode.key`：画布拖放身份标识。
- `meta.rawSchema`：`schemaToDsl` 对未注册类型节点的无损兜底（原始 schema 节点）；剥离后
  若 `meta` 变成空对象，`meta` 键本身也会一并删除。

不改动传入对象（源码见 `src/dsl/portable.ts`）。后端持久化前应当调用它，存储剥离后的结果；
前端渲染仍然使用未剥离的原始 `FormDefinition`（`key` 是画布拖拽排序/选中定位要用的）。

## 完整示例

以下示例覆盖：字段、容器（`card`）、条件必填（`requiredIf`）、表达式值（`expr`）、校验规则
（`validation`）。已在 scratchpad 用临时脚本调用本仓库的 `schemaToDsl(dslToSchema(definition))`
验证过可以无损往返（`requiredIf`/`expr`/`validation` 均正确还原）。

```json
{
  "version": 1,
  "id": "demo-form",
  "name": "demo",
  "description": "示例：请假申请",
  "root": {
    "id": "root",
    "category": "container",
    "type": "group",
    "renderAs": "formkit",
    "dataType": "object",
    "children": [
      {
        "id": "f1",
        "key": "k1",
        "name": "hasOtherIncome",
        "label": "是否有其他收入",
        "type": "naiveSwitch",
        "category": "field",
        "renderAs": "cmp",
        "target": "NaiveSwitch",
        "value": false,
        "outerClass": "col-span-6"
      },
      {
        "id": "f2",
        "key": "k2",
        "name": "incomeDesc",
        "label": "收入说明",
        "type": "text",
        "category": "field",
        "renderAs": "cmp",
        "outerClass": "col-span-6",
        "requiredIf": {
          "type": "call",
          "fn": "eq",
          "args": [
            { "type": "field", "name": "hasOtherIncome" },
            { "type": "literal", "value": true }
          ]
        },
        "validation": [{ "rule": "length", "args": [0, 200] }]
      },
      {
        "id": "f3",
        "key": "k3",
        "name": "total",
        "label": "合计",
        "type": "number",
        "category": "field",
        "renderAs": "cmp",
        "outerClass": "col-span-6",
        "expr": "$price * $count"
      }
    ]
  },
  "settings": {
    "labelAlign": "top",
    "labelWidth": 100,
    "showReset": true
  }
}
```

对应可读源码：`incomeDesc` 的条件必填是 `$hasOtherIncome == true`；`total` 的表达式值是
`$price * $count`。

## 与代码的对应关系

| 文档章节                                                                           | 源码文件                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 顶层结构 / FormSettings / BaseNode / 四类节点 / `DSL_VERSION`                      | `src/types/dsl.ts`                                                                    |
| 元素目录（字段 / 容器 / 静态，含每个 type 的默认 props）                           | `src/elements/definitions/fields.ts`、`static.ts`、`containers.ts`                    |
| 容器数据结构规格（dataShape / keyProp / primitive）                                | `src/elements/container-spec.ts`                                                      |
| DSL ⇄ FormKit schema 转换（字段/容器/布局/静态节点）                               | `src/dsl/convert/field.ts`、`container.ts`、`layout.ts`、`static.ts`、`shared.ts`     |
| 顶层适配（`dslToSchema` / `dslToOutputSchema` / `schemaToDsl` / flat-nested 包装） | `src/dsl/schema-adapter.ts`                                                           |
| 校验规则编译 / 解析（`ValidationRule[]` ⇄ FormKit 数组语法）                       | `src/dsl/compile.ts`（`resolveValidation`）、`src/dsl/convert/validation-parse.ts`    |
| 校验规则清单（编辑面板实际提供的规则与适用字段类型）                               | `src/components/sidebar-right/validations/ValidationSection.vue`                      |
| 表达式 AST 与内置函数                                                              | `src/dsl/expr-builtins.ts`                                                            |
| 表达式可读源码 ⇄ AST                                                               | `src/dsl/expr-source.ts`、`src/dsl/convert/expr-parse.ts`                             |
| 表达式编译为 schema 的 `if` / helper 调用                                          | `src/dsl/compile.ts`、`src/dsl/expr-schema-helpers.ts`                                |
| 表达式求值（`expr` 字段计算 / 设计器实时预览）                                     | `src/dsl/eval.ts`                                                                     |
| 条件必填 / 禁用 / 只读的编译与叠加规则                                             | `src/dsl/convert/field.ts`、`src/components/ui/formkit/use-schema-attrs.ts`           |
| 事件绑定的定义、编译与执行                                                         | `src/types/dsl.ts`（`FORM_EVENTS`）、`src/dsl/events.ts`、`src/utils/bind-runtime.ts` |
| 动态字典（`options.dynamic`）                                                      | `src/types/env.ts`、`src/composables/use-dictionary.ts`                               |
| 剥离前端专用字段                                                                   | `src/dsl/portable.ts`                                                                 |
| 表单体检（引用不存在字段等问题检测）                                               | `src/dsl/lint.ts`                                                                     |
| 改名同步引用                                                                       | `src/dsl/refs.ts`                                                                     |
