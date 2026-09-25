import type { FormKitNode } from '@formkit/core'

/**
 * @privateRemarks
 * This theme file has been edited manually and is no longer able to be updated
 * by the cli tool. If you need to make changes to this theme, please make sure
 * to edit the `formkit.theme.ts` file instead.
 *
 * @variables - radius=rounded-xl,accentColor=green,colorTemperature=stone,spacing=1.5,scale=sm,inputShadow=shadow-md,baseColorShade=600,borderShadeLightMode=400,borderShadeDarkMode=800,inputMaxWidth=max-w-[24em],tagRadius=rounded,swatchRadius=rounded
 * @theme - form-forge-custom
 **/

/**
 * This is the theme function itself, it should be imported and used as the
 * config.rootClasses function. For example:
 *
 * ```js
 * import { theme } from './formkit.theme'
 * import { defineFormKitConfig } from '@formkit/vue'
 *
 * export default defineFormKitConfig({
 *   config: {
 *     rootClasses: theme
 *   }
 * })
 * ```
 **/

export function rootClasses(sectionName: string, node: FormKitNode): Record<string, boolean> {
  const semanticKey = `formkit-${sectionName}`
  const familyKey = node.props.family ? `family:${node.props.family}__${sectionName}` : ''
  const type = node.props.$formkit || node.props.type
  if (node.props.family === 'naive') {
    if (sectionName === 'outer') {
      return { [semanticKey]: true, 'w-full': true }
    }
    if (sectionName === 'wrapper') {
      return {
        [semanticKey]: true,
        'w-full': true,
      }
    }
    if (sectionName === 'inner') {
      return {
        [semanticKey]: true,
        'w-full': true,
        '!p-0': true,
        '!border-none': true,
        '!bg-transparent': true,
        '!shadow-none': true,
      }
    }
    if (sectionName === 'input') {
      return {
        [semanticKey]: true,
        'w-full': true,
        '!p-0': true,
        '!border-none': true,
        '!bg-transparent': true,
      }
    }
    if (sectionName === 'label') {
      if (type === 'submit' || type === 'reset' || type === 'naiveButton') {
        return { [semanticKey]: true, hidden: true }
      }
      return {
        [semanticKey]: true,
        block: true,
        '!text-xs': true,
        '!font-bold': true,
        'mb-1': true,
        'text-neutral-700': true,
        'dark:text-zinc-300': true,
      }
    }
    if (sectionName === 'help') {
      if (type === 'submit' || type === 'reset' || type === 'naiveButton') {
        return { [semanticKey]: true, hidden: true }
      }
      return {
        [semanticKey]: true,
        'text-[11px]': true,
        'text-neutral-500': true,
        'font-normal': true,
        'mt-0.5': true,
        'dark:text-zinc-400': true,
      }
    }
    if (sectionName === 'messages') {
      return {
        [semanticKey]: true,
        'mt-1': true,
        'space-y-0.5': true,
        // 圆点由 message 的 before 伪元素画，去掉 <ul> 的默认列表样式和缩进，避免出现两个圆点
        'list-none': true,
        'mb-0': true,
        'p-0': true,
      }
    }
    if (sectionName === 'message') {
      return {
        [semanticKey]: true,
        'text-red-500': true,
        'text-[11px]': true,
        '[line-height:1.2]': true,
        'pl-1.5': true,
        relative: true,
        "before:content-['•']": true,
        'before:absolute': true,
        'before:left-0': true,
        'before:top-0': true,
        'dark:text-red-400': true,
      }
    }
    if (sectionName === 'messageLink') {
      return {
        [semanticKey]: true,
        'outline-none': true,
        'focus-visible:ring-2': true,
        'focus-visible:ring-offset-2': true,
        'focus-visible:ring-red-500': true,
      }
    }
    return { [semanticKey]: true }
  }

  const key = `${node.props.type}__${sectionName}`
  if (sectionName === 'label') {
    if (type === 'submit' || type === 'reset' || type === 'naiveButton') {
      return { [semanticKey]: true, hidden: true }
    }
  }
  const memoKey = `${key}__${familyKey}`
  if (!(memoKey in classes)) {
    const sectionClasses = classes[key] ?? globals[sectionName] ?? {}
    sectionClasses[semanticKey] = true
    if (familyKey in classes) {
      classes[memoKey] = { ...classes[familyKey], ...sectionClasses }
    } else {
      classes[memoKey] = sectionClasses
    }
  }
  return classes[memoKey] ?? { [semanticKey]: true }
}

/**
 * These classes have already been merged with globals and are ready to be used
 * directly in the theme.
 **/
// 项目里所有内置输入类型都经 buildFormkitInputs 统一注册为 family: 'naive'（见
// elements/formkit.ts），上面 family === 'naive' 分支会提前 return，永远走不到这份表；
// 真正会查这份表的只有 DSL 直接用到、未被覆盖的原生 FormKit 类型 $formkit: 'form' /
// 'group' / 'list'，而 group / list 的 schema 没有声明任何 section（不会调用
// rootClasses），实际只有 form 节点自身的几个 section 会命中。原 FormKit 主题脚手架
// 为其余所有原生/Pro 输入类型（checkbox / select / dropdown / slider / repeater /
// colorpicker / datepicker / mask / rating / taglist / toggle / transferlist /
// multi-step 等，本项目均未使用或已用 naive 版本整体覆盖）生成的条目从未被读取过，
// 已删除；对照结果见 W2 任务报告。
const classes: Record<string, Record<string, boolean>> = {
  form__form: {
    'group/form': true,
  },
  form__actions: {
    '': true,
  },
  form__summaryInner: {
    'group/summary': true,
    border: true,
    'border-neutral-400': true,
    'bg-white': true,
    'rounded-xl': true,
    'py-1.5': true,
    'px-2.5': true,
    'shadow-md': true,
    'dark:bg-transparent': true,
    'dark:border-zinc-800': true,
  },
  form__summaryHeader: {
    'text-base': true,
    'text-neutral-700': true,
    'font-bold': true,
    'mb-1.5': true,
    'dark:text-zinc-300': true,
  },
  form__messages: {
    '': true,
  },
  form__message: {
    'text-red-600': true,
    'mb-1.5': true,
    'text-[11px]': true,
    '[line-height:1em]': true,
    'dark:text-red-400': true,
    'group-[]/summary:text-xs': true,
  },
  form__messageLink: {
    'group-[]/summary:outline-none': true,
    'group-[]/summary:focus-visible:ring-2': true,
    'group-[]/summary:ring-green-600': true,
  },
}

/**
 * Globals are merged prior to generating this file — these are included for
 * any other non-matching inputs.
 **/
const globals: Record<string, Record<string, boolean>> = {
  outer: {
    group: true,
    'max-w-full': true,
    'min-w-full': true,
    grow: true,
    'mb-3.5': true,
    'data-[disabled]:select-none': true,
    'data-[disabled]:opacity-50': true,
    'text-sm': true,
  },
  label: {
    'pointer-events-none': true,
    block: true,
    'text-neutral-700': true,
    'text-xs': true,
    'font-bold': true,
    'mb-0.5': true,
    'dark:text-zinc-300': true,
  },
  legend: {
    block: true,
    'text-neutral-700': true,
    'text-xs': true,
    'font-bold': true,
    'dark:text-zinc-300': true,
  },
  input: {
    'appearance-none': true,
    '[color-scheme:light]': true,
    'dark:[color-scheme:dark]': true,
    'selection:bg-green-100': true,
    'selection:text-neutral-700': true,
    'group-data-[has-overlay]:selection:!text-transparent': true,
  },
  prefixIcon: {
    flex: true,
    'items-center': true,
    '-ml-0.5': true,
    'mr-1.5': true,
    'text-sm': true,
    'h-[1em]': true,
    'w-[1em]': true,
    'shrink-0': true,
    '[&>svg]:w-full': true,
  },
  suffixIcon: {
    flex: true,
    'items-center': true,
    '-mr-0.5': true,
    'ml-1.5': true,
    'text-sm': true,
    'h-[1em]': true,
    'w-[1em]': true,
    'shrink-0': true,
    '[&>svg]:w-full': true,
  },
  loaderIcon: {
    'animate-spin': true,
    flex: true,
    'items-center': true,
    'my-auto': true,
    'ml-1.5': true,
    'text-sm': true,
    'text-neutral-500': true,
    'h-[1em]': true,
    'w-[1em]': true,
    'shrink-0': true,
    '[&>svg]:w-full': true,
  },
  loadMoreInner: {
    flex: true,
    'text-xs': true,
    'text-neutral-500': true,
    'p-1.5': true,
    'items-center': true,
    'justify-center': true,
    '[&>span]:mr-1.5': true,
  },
  help: {
    'text-neutral-500': true,
    'text-[11px]': true,
    '[line-height:1em]': true,
    'dark:text-zinc-400': true,
  },
  message: {
    'text-red-600': true,
    'mb-1.5': true,
    'text-[11px]': true,
    '[line-height:1em]': true,
    'dark:text-red-400': true,
  },
  overlay: {
    'text-neutral-700': true,
    'dark:text-zinc-300': true,
  },
  overlayPlaceholder: {
    'text-neutral-400': true,
    'dark:text-zinc-400/50': true,
  },
  overlayLiteral: {
    'text-neutral-700': true,
    'dark:text-zinc-300': true,
  },
  overlayChar: {
    'text-neutral-700': true,
    'dark:text-zinc-300': true,
  },
  overlayEnum: {
    'text-neutral-700': true,
    'dark:text-zinc-300': true,
  },
}
