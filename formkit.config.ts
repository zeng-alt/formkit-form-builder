// formkit.config.ts
import { rootClasses } from './formkit.theme.ts'
import { defaultConfig, createInput } from '@formkit/vue'
import CustomButton from './src/components/ui/button/CustomButton.vue'

export default defaultConfig({
  config: {
    rootClasses,
  },
  inputs: {
    naiveButton: createInput(CustomButton, { props: ['buttonProps'] }),
  },
})
