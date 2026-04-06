<template>
  <v-row dense class="align-center">
    <v-col :cols="nameCols">
      <v-combobox
        v-model="internalValue.name"
        :items="tagNames"
        label="Tag Key"
        :density="density"
        variant="solo-filled"
        :hide-details="hideDetails"
        @update:model-value="onUpdate"
      ></v-combobox>
    </v-col>
    <v-col :cols="valueCols">
      <v-combobox
        v-model="internalValue.value"
        :items="tagValues"
        label="Value"
        :density="density"
        variant="solo-filled"
        :hide-details="hideDetails"
        @update:model-value="onUpdate"
      ></v-combobox>
    </v-col>
    <v-col v-if="removable" cols="auto">
      <v-btn icon="mdi-close" variant="text" size="small" color="error" @click="$emit('remove')"></v-btn>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  modelValue: { name: string; value?: string | null }
  allTags: any[]
  density?: 'compact' | 'default' | 'comfortable'
  hideDetails?: boolean
  removable?: boolean
  nameCols?: number | string
  valueCols?: number | string
}>()

const emit = defineEmits(['update:modelValue', 'remove'])

const internalValue = ref({ ...props.modelValue })

watch(() => props.modelValue, (newVal) => {
  internalValue.value = { ...newVal }
}, { deep: true })

const tagNames = computed(() => [...new Set(props.allTags.map(t => t.name))])
const tagValues = computed(() => {
  if (!internalValue.value.name) return []
  return [...new Set(props.allTags
    .filter(t => t.name === internalValue.value.name)
    .map(t => t.value)
    .filter(Boolean))]
})

function onUpdate() {
  emit('update:modelValue', { ...internalValue.value })
}

const nameCols = computed(() => props.nameCols || (props.removable ? 5 : 6))
const valueCols = computed(() => props.valueCols || (props.removable ? 5 : 6))
const density = computed(() => props.density || 'compact')
</script>
 Riverside:
