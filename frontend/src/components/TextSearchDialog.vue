<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="800px">
    <v-card class="glass-card rounded-xl border border-white border-opacity-10" elevation="24">
      <v-card-title class="pa-6 d-flex align-center">
        <v-icon class="me-3" color="primary">mdi-magnify</v-icon>
        <span class="text-h5 font-weight-bold">Search Texts</span>
        <v-spacer></v-spacer>
        <v-btn icon="mdi-close" variant="text" @click="$emit('update:modelValue', false)"></v-btn>
      </v-card-title>

      <v-card-text class="pa-6 pt-0">
        <v-text-field
          v-model="searchQuery"
          prepend-inner-icon="mdi-magnify"
          label="Search by content or summary..."
          variant="solo-filled"
          density="compact"
          hide-details
          class="mb-6"
          @update:model-value="onSearch"
        ></v-text-field>

        <v-list
          v-if="texts.length > 0"
          bg-color="transparent"
          class="rounded-lg border border-white border-opacity-5"
          max-height="400px"
        >
          <v-list-item
            v-for="text in texts"
            :key="text.id"
            :value="text"
            rounded="xl"
            class="mb-2 mx-2"
            @click="selectText(text)"
          >
            <template v-slot:prepend>
              <v-icon color="primary">mdi-text-box-outline</v-icon>
            </template>
            <v-list-item-title class="font-weight-bold">
              {{ text.content.slice(0, 100) }}...
            </v-list-item-title>
            <v-list-item-subtitle v-if="text.summary">
              {{ text.summary.slice(0, 80) }}...
            </v-list-item-subtitle>
            <template v-slot:append>
              <v-btn
                color="primary"
                variant="tonal"
                size="small"
                rounded="pill"
              >Select</v-btn>
            </template>
          </v-list-item>
        </v-list>

        <div v-else-if="!loading" class="text-center py-8 text-grey">
          No texts found matching your search.
        </div>

        <div v-if="loading" class="text-center py-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
        </div>
        
        <div v-if="texts.length < totalCount" class="text-center mt-4">
          <v-btn variant="text" size="small" @click="loadMore" :loading="loading">
            Load More ({{ texts.length }} / {{ totalCount }})
          </v-btn>
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { graphql } from '../composables/useGraphql'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'select'])

const searchQuery = ref('')
const texts = ref<any[]>([])
const loading = ref(false)
const totalCount = ref(0)
const currentPage = ref(1)
const itemsPerPage = 10

async function fetchTexts(reset = false) {
  if (reset) {
    currentPage.value = 1
    texts.value = []
  }
  
  loading.value = true
  const data = await graphql(`
    query($filter: TextFilterInput, $skip: Int, $take: Int) {
      texts(filter: $filter, skip: $skip, take: $take) {
        items {
          id
          content
          summary
        }
        totalCount
      }
    }
  `, {
    skip: (currentPage.value - 1) * itemsPerPage,
    take: itemsPerPage,
    filter: searchQuery.value ? { search: searchQuery.value } : undefined
  })
  
  if (data?.texts) {
    if (reset) texts.value = data.texts.items
    else texts.value.push(...data.texts.items)
    totalCount.value = data.texts.totalCount
  }
  loading.value = false
}

function onSearch() {
  fetchTexts(true)
}

function loadMore() {
  currentPage.value++
  fetchTexts()
}

function selectText(text: any) {
  emit('select', text)
  emit('update:modelValue', false)
}

watch(() => props.modelValue, (val) => {
  if (val && texts.value.length === 0) {
    fetchTexts(true)
  }
})
</script>
