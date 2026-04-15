// formkit.config.ts
import { rootClasses } from './formkit.theme.ts'
import { defaultConfig, createInput } from '@formkit/vue'
import CustomButton from './src/components/ui/button/CustomButton.vue'

export default defaultConfig({
    config: {
        rootClasses,
    },
    inputs: {
        // @ts-expect-error type button is not in FormKitNodeType
        button: createInput(CustomButton, { type: 'button', props: ['buttonProps'] }),
        // @ts-expect-error type button is not in FormKitNodeType
        submit: createInput(CustomButton, { type: 'button', props: ['buttonProps'] }),
    }
})