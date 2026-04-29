import ListContainer from '@/components/ui/containers/list/ListContainer.vue'
import ListContainerPreview from '@/components/ui/containers/list/ListContainerPreview.vue'
import CardContainer from '@/components/ui/containers/card/CardContainer.vue'
import CardContainerPreview from '@/components/ui/containers/card/CardContainerPreview.vue'
import InputGroupContainer from '@/components/ui/containers/input-group/InputGroupContainer.vue'
import InputGroupContainerPreview from '@/components/ui/containers/input-group/InputGroupContainerPreview.vue'
import TabsContainer from '@/components/ui/containers/tabs/TabsContainer.vue'
import TabsContainerPreview from '@/components/ui/containers/tabs/TabsContainerPreview.vue'
import { getCanvasSchemaLibrary, getPreviewSchemaLibrary } from '@/containers/registry'

export {
  ListContainer,
  ListContainerPreview,
  CardContainer,
  CardContainerPreview,
  InputGroupContainer,
  InputGroupContainerPreview,
  TabsContainer,
  TabsContainerPreview,
}

export const canvasSchemaLibrary = getCanvasSchemaLibrary()

export const previewSchemaLibrary = getPreviewSchemaLibrary()
