import { ref, provide, inject } from 'vue'
const Key = Symbol('WriteAllImported')
export function provideWriteAllImported() {
  const bcuParameterRef = ref(null)
  const alarmConfigRef = ref(null)
  const soxConfigRef = ref(null)

  async function writeAllImportedAcross() {
    if (bcuParameterRef.value?.writeImported) await bcuParameterRef.value.writeImported()
    if (alarmConfigRef.value?.writeImported) await alarmConfigRef.value.writeImported()
    if (soxConfigRef.value?.writeImported) await soxConfigRef.value.writeImported()
  }

  provide(Key, {
    bcuParameterRef,
    alarmConfigRef,
    soxConfigRef,
    writeAllImportedAcross
  })
}
// 在子组件里 inject
export function useWriteAllImported() {
  const ctx = inject(Key)
  if (!ctx) {
    throw new Error('useWriteAllImported() 必须在 provideWriteAllImported() 的上下文中使用')
  }
  return ctx
}
