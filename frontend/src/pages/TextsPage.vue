<template>
  <v-container fluid class="pa-8">
    <div class="d-flex align-center mb-8">
      <div>
        <h2 class="text-h4 font-weight-black tracking-tighter uppercase mb-1">Sources Hub</h2>
        <div class="text-caption text-grey font-weight-medium">MANAGING {{ totalCount }} KNOWLEDGE SOURCES</div>
      </div>
      <v-spacer></v-spacer>
      <v-btn color="primary" variant="flat" rounded="pill" prepend-icon="mdi-plus" size="large" class="px-6" @click="showCreateDialog = true">
        New Source
      </v-btn>
    </div>

    <!-- Search / Filter -->
    <div class="d-flex align-center mb-6 ga-4">
      <v-text-field
        v-model="search"
        prepend-inner-icon="mdi-magnify"
        label="Search sources..."
        variant="solo-filled"
        density="compact"
        clearable
        hide-details
      ></v-text-field>
      <v-btn
        :color="showFilters ? 'primary' : 'default'"
        variant="tonal"
        icon="mdi-filter-variant"
        @click="showFilters = !showFilters"
      ></v-btn>
    </div>

    <!-- Advanced Filters -->
    <v-expand-transition>
      <div v-if="showFilters" class="mb-6">
        <v-card variant="outlined" class="pa-4 glass-card border-dashed">
          <v-row density="compact">
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filters.startDate"
                label="Start Date"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="4">
              <v-text-field
                v-model="filters.endDate"
                label="End Date"
                type="date"
                variant="outlined"
                density="compact"
                hide-details
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="3">
              <TagManager v-model="filters.tags" :all-tags="allTags" label="Filter by Tags" density="compact" />
            </v-col>
            <v-col cols="12" md="3" class="d-flex align-center">
              <v-checkbox
                v-model="filters.isPublished"
                label="Published Only"
                density="compact"
                hide-details
                color="primary"
              ></v-checkbox>
            </v-col>
          </v-row>
        </v-card>
      </div>
    </v-expand-transition>

    <!-- Texts List -->
    <v-row>
      <v-col v-for="source in sources" :key="source.id" cols="12">
        <v-card class="glass-card mb-2 rounded-xl border-opacity-10" elevation="2" hover @click="navigateToWiki(source)">
          <v-card-text class="pa-6">
            <div class="d-flex align-start ga-6">
              <v-avatar :color="source.type === 'WIKI_PAGE' ? 'primary' : 'secondary'" variant="tonal" rounded="lg" size="48">
                <v-icon>{{ source.type === 'WIKI_PAGE' ? 'mdi-book-open-page-variant' : 'mdi-web' }}</v-icon>
              </v-avatar>
              
              <div class="flex-grow-1">
                <div class="text-caption font-weight-black opacity-30 mb-1 uppercase tracking-widest d-flex align-center ga-2">
                  <v-icon size="14">mdi-identifier</v-icon> {{ source.path || source.id }}
                  <span v-if="source.materializedPath" class="opacity-20">/ {{ source.materializedPath }}</span>
                </div>
                <div class="text-h6 font-weight-bold mb-2">
                  {{ source.title || 'Untitled Source' }}
                </div>
                
                <div v-if="source.texts?.[0]" class="text-body-2 opacity-50 mb-4 reading-typography line-clamp-2" style="font-size: 0.95rem; line-height: 1.6;">
                  {{ source.texts[0].content.slice(0, 300) }}...
                </div>
                <div v-else class="text-body-2 opacity-20 italic mb-4">
                  No content associated with this source.
                </div>

                <div class="d-flex align-center ga-3 flex-wrap">
                  <v-chip v-for="tag in source.tags" :key="tag.id" size="x-small" variant="tonal" color="primary">
                    {{ tag.name }}: {{ tag.value }}
                  </v-chip>
                  <v-chip size="x-small" :color="source.isPublished ? 'success' : 'warning'" variant="tonal">
                     {{ source.isPublished ? 'PUBLISHED' : 'DRAFT' }}
                  </v-chip>
                  <v-chip size="x-small" variant="outlined" class="opacity-30">{{ source.type }}</v-chip>
                  <span class="text-caption opacity-30 ms-auto">Updated {{ formatDate(source.updatedAt) }}</span>
                </div>
              </div>

              <div class="d-flex flex-column ga-2">
                <v-btn icon="mdi-open-in-new" variant="text" color="primary" @click.stop="navigateToWiki(source)"></v-btn>
                <v-btn icon="mdi-delete-outline" variant="text" color="error" size="small" @click.stop="confirmDelete(source)"></v-btn>
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <!-- Paging -->
    <div v-if="sources.length < totalCount" class="text-center mt-8">
      <v-btn
        variant="tonal"
        rounded="pill"
        prepend-icon="mdi-chevron-down"
        :loading="loading"
        @click="loadMore"
      >
        Load More ({{ sources.length }} of {{ totalCount }})
      </v-btn>
    </div>

    <div v-if="sources.length === 0 && !loading" class="text-center text-grey py-16">
      <v-icon size="100" color="primary" class="mb-6 opacity-20">mdi-database-plus-outline</v-icon>
      <div class="text-h4 font-weight-black text-white mb-2 uppercase tracking-tighter">Your Graph is Empty</div>
      <div class="text-body-1 text-grey mb-8">Establish a new knowledge source to begin your structural research.</div>
      <v-btn color="primary" variant="flat" rounded="pill" size="large" class="px-10" prepend-icon="mdi-plus" @click="showCreateDialog = true">
        Establish Source
      </v-btn>
    </div>

    <!-- Create Text Dialog -->
    <v-dialog v-model="showCreateDialog" max-width="700">
      <v-card rounded="xl" class="pa-4">
        <v-tabs v-model="createTab" color="primary" grow class="mb-4">
          <v-tab value="manual">Manual Entry</v-tab>
          <v-tab value="url">From URL</v-tab>
        </v-tabs>

        <v-window v-model="createTab" style="max-height: 70vh; overflow-y: auto;" class="pr-2">
          <v-window-item value="manual">
            <v-card-text class="pa-0 pt-4">
              <MarkdownToolbar @apply="applyManualFormat" class="mb-2" />
              <v-textarea
                ref="manualTextArea"
                v-model="newText.content"
                label="Text Content"
                variant="solo-filled"
                rows="12"
                placeholder="Paste the text or markdown to add..."
                auto-grow
              ></v-textarea>
              <v-text-field
                v-model="newText.source.title"
                label="Source Title"
                variant="solo-filled"
                class="mb-4"
                hide-details
              ></v-text-field>

              <TextMetadataEditor v-model="newText" />
            </v-card-text>
          </v-window-item>

          <v-window-item value="url">
            <v-card-text class="pa-0 pt-4">
              <div class="text-body-2 mb-4 text-grey">
                Paste a URL to extract text from web sources.
              </div>
              <v-text-field
                v-model="newText.source.url"
                label="URL"
                variant="solo-filled"
                prepend-inner-icon="mdi-link-variant"
              ></v-text-field>
            </v-card-text>
          </v-window-item>
        </v-window>

        <v-card-actions class="mt-4">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showCreateDialog = false">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            rounded="pill"
            class="px-8"
            :loading="loading"
            :disabled="!newText.content.trim() && !newText.source.url.trim()"
            @click="createText"
          >
            Add Text
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card rounded="xl" class="pa-4">
        <v-card-title>Confirm Deletion</v-card-title>
        <v-card-text>Remove this content from the repository?</v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" rounded="pill" @click="deleteText">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { graphql, showSuccess } from '../composables/useGraphql'
import TagManager from '../components/TagManager.vue'
import TextMetadataEditor from '../components/TextMetadataEditor.vue'
import MarkdownToolbar from '../components/MarkdownToolbar.vue'
import { useMarkdownEditor } from '../composables/useMarkdownEditor'

const route = useRoute()
const router = useRouter()

const sources = ref<any[]>([])
const manualTextArea = ref<any>(null)
const { applyFormat: applyManualFormat } = useMarkdownEditor(computed({
  get: () => newText.value.content,
  set: (val) => newText.value.content = val
}) as any, manualTextArea)

const search = ref('')
const loading = ref(false)
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const showDetailDialog = ref(false)
const showEditDialog = ref(false)
const textToDelete = ref<any>(null)
const selectedText = ref<any>(null)
const createTab = ref('manual')
const urlToExtract = ref('')
const allTags = ref<any[]>([])
const totalCount = ref(0)
const itemsPerPage = 20
const currentPage = ref(1)

const filters = ref({
  search: '',
  startDate: '',
  endDate: '',
  tags: [] as any[],
  isPublished: false
})

const showFilters = ref(false)

const newText = ref({
  content: '',
  language: 'et',
  isPublished: false,
  textParentId: null as string | null,
  path: null as string | null,
  source: { title: '', url: '', type: 'ARTICLE', description: '' },
  tags: [] as any[]
})
const editText = ref({
  id: '',
  content: '',
  language: 'et',
  path: null as string | null,
  tags: [] as any[]
})

const languages = [
  { label: 'Eesti (ET)', value: 'et' },
  { label: 'English (EN)', value: 'en' },
]

const sourceTypes = ['ARTICLE', 'BOOK', 'VIDEO', 'PODCAST', 'SOCIAL_MEDIA', 'OTHER']

const filteredSources = computed(() => {
  return sources.value
})

function formatDate(dateVal: string | number) {
  if (!dateVal) return 'No date'
  
  // Handle numeric strings (milliseconds)
  const timestamp = typeof dateVal === 'string' && /^\d+$/.test(dateVal) 
    ? parseInt(dateVal, 10) 
    : dateVal;
    
  const date = new Date(timestamp)
  if (isNaN(date.getTime())) return dateVal.toString()
  return date.toLocaleDateString()
}

onMounted(() => {
  fetchSources()
  fetchTags()
})

async function fetchSources(reset = false) {
  if (reset) {
    currentPage.value = 1
    sources.value = []
  }
  
  loading.value = true
  
  const variables: any = {
    skip: (currentPage.value - 1) * itemsPerPage,
    take: itemsPerPage,
    filter: {
      search: search.value || undefined,
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined,
      tags: filters.value.tags.length > 0 ? filters.value.tags : undefined
    }
  }

  const data = await graphql(`
    query($filter: WikiFilterInput, $skip: Int, $take: Int) {
      sources(filter: $filter, skip: $skip, take: $take) {
        items {
          id path materializedPath title type isPublished updatedAt
          tags { id name value }
          texts(take: 1) { id content createdAt }
        }
        totalCount
      }
    }
  `, variables)
  
  if (data?.sources) {
    if (reset) {
      sources.value = data.sources.items
    } else {
      sources.value.push(...data.sources.items)
    }
    totalCount.value = data.sources.totalCount
  }
  loading.value = false
}

async function loadMore() {
  if (sources.value.length < totalCount.value) {
    currentPage.value++
    await fetchSources()
  }
}

watch(search, () => {
  fetchSources(true)
})

watch(filters, () => {
  fetchSources(true)
}, { deep: true })

async function fetchTags() {
  const data = await graphql(`
    query {
      tags { id name value }
    }
  `)
  if (data?.tags) allTags.value = data.tags
}

function confirmDelete(text: any) {
  textToDelete.value = text
  showDeleteDialog.value = true
}

async function deleteText() {
  if (!textToDelete.value) return
  loading.value = true
  const data = await graphql(`mutation($id: ID!) { deleteWikiPage(id: $id) }`, { id: textToDelete.value.id })
  if (data?.deleteWikiPage) {
    sources.value = sources.value.filter((s: any) => s.id !== textToDelete.value.id)
    totalCount.value = Math.max(0, totalCount.value - 1)
    showDeleteDialog.value = false
    showSuccess('Source and content removed from Knowledge Graph')
  }
  loading.value = false
}

function navigateToWiki(source: any) {
  const path = source.materializedPath || source.path
  if (path) {
    router.push('/wiki/' + path)
  }
}

async function createText() {
  if (!newText.value.content.trim()) return
  loading.value = true
  let path = newText.value.path?.trim()
  const sourceUrl = newText.value.source.url?.trim()
  
  if (!path && sourceUrl && sourceUrl.startsWith('http')) {
      // If URL provided but no path, we can still use URL as a fallback for path generation
      // but user said "don't use imports/ prefix" and "use ID if no path"
      // so we keep it empty to let server decide or use a temp slug.
      path = '' 
  } else if (!path) {
      path = ''
  }

  const data = await graphql(`
    mutation($input: WikiPageInput!) {
      saveWikiPage(input: $input) { id path title }
    }
  `, {
    input: {
      path: path || `id-${Date.now()}`, // temp path if empty, server will fix
      title: newText.value.source.title || 'Manual Entry',
      content: newText.value.content,
      language: newText.value.language,
      url: newText.value.source.url || undefined,
      isPublished: newText.value.isPublished,
      textParentId: newText.value.textParentId || undefined,
      tags: newText.value.tags.map(t => ({ name: t.name, value: t.value }))
    }
  })

  if (data?.saveWikiPage) {
    showSuccess('Wiki Entry Created')
    showCreateDialog.value = false
    fetchSources(true)
  }
  loading.value = false
}
</script>

<style scoped>
.glass-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.02) !important;
}
.glass-card:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  transform: translateY(-2px);
  border-color: rgba(187, 134, 252, 0.3);
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
 Riverside:
