<template>
  <div>
    <v-list-item
      v-if="!hasChildren"
      :to="'/wiki/' + node.materializedPath"
      :title="node.title || node.path"
      prepend-icon="mdi-file-outline"
      rounded="lg"
      class="mb-1"
    ></v-list-item>

    <v-list-group v-else :value="isOpen" @click:open="onOpen">
      <template v-slot:activator="{ props }">
        <v-list-item
          v-bind="props"
          :prepend-icon="isOpen ? 'mdi-folder-open-outline' : 'mdi-folder-outline'"
          :title="node.title || node.path"
          rounded="lg"
          class="mb-1"
          :to="'/wiki/' + node.materializedPath"
        ></v-list-item>
      </template>

      <div v-if="loading" class="ps-10 py-2">
        <v-progress-linear indeterminate color="primary" height="1"></v-progress-linear>
      </div>
      
      <div v-else class="ps-4">
        <WikiTreeItem
          v-for="child in children"
          :key="child.id"
          :node="child"
        />
        <!-- Quick add in this folder -->
        <v-list-item
          prepend-icon="mdi-plus"
          title="Add sub-page..."
          class="opacity-30"
          @click="addSubPage"
        ></v-list-item>
      </div>
    </v-list-group>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { graphql } from '../composables/useGraphql'
import WikiTreeItem from './WikiTreeItem.vue' // Recursive

const props = defineProps<{
  node: any
}>()

const router = useRouter()
const children = ref<any[]>([])
const loading = ref(false)
const isOpen = ref(false)

const hasChildren = computed(() => props.node._count?.children > 0)

async function onOpen() {
  if (children.value.length > 0) return
  
  loading.value = true
  const data = await graphql(`
    query($parentId: ID) {
      wikiTree(parentId: $parentId) {
        id
        path
        materializedPath
        title
        _count { children }
      }
    }
  `, { parentId: props.node.id })
  
  if (data?.wikiTree) {
    children.value = data.wikiTree
  }
  loading.value = false
}

function addSubPage() {
  const newPath = props.node.materializedPath + '/new-page'
  router.push('/wiki/' + newPath)
}
</script>
