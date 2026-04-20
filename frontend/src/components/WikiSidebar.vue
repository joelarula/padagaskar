<template>
  <div class="wiki-sidebar h-100 d-flex flex-column">
    <div class="pa-4 d-flex align-center justify-space-between">
      <span class="text-overline font-weight-black opacity-40">Text Index</span>
      <v-btn icon="mdi-plus" variant="text" size="x-small" @click="createNewPage"></v-btn>
    </div>

    <v-list density="compact" nav class="px-2 flex-grow-1 overflow-y-auto">
      <v-list-item
        prepend-icon="mdi-home-outline"
        title="Wiki Home"
        to="/wiki/home"
        rounded="lg"
        class="mb-1"
      ></v-list-item>

      <v-divider class="my-2 opacity-5"></v-divider>

      <!-- Root Level Tree -->
      <WikiTreeItem
        v-for="node in rootNodes"
        :key="node.id"
        :node="node"
      />

      <div v-if="loading && rootNodes.length === 0" class="text-center py-4">
        <v-progress-linear indeterminate color="primary" height="2"></v-progress-linear>
      </div>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { graphql } from '../composables/useGraphql'
import WikiTreeItem from './WikiTreeItem.vue'

const router = useRouter()
const rootNodes = ref<any[]>([])
const loading = ref(false)

async function fetchRoot() {
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
  `, { parentId: null })
  
  if (data?.wikiTree) {
    rootNodes.value = data.wikiTree
  }
  loading.value = false
}

function createNewPage() {
  router.push('/wiki/new-page-' + Math.floor(Math.random() * 1000))
}

// Provide a way for children to reload if needed
provide('refreshWikiTree', fetchRoot)

onMounted(fetchRoot)
</script>

<style scoped>
.wiki-sidebar {
  background-color: transparent;
}
</style>
