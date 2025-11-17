<script setup>
import { ref, onBeforeMount, reactive } from 'vue'
import { FilterMatchMode, FilterOperator } from 'primevue/api'
import { CustomerService } from '@/service/CustomerService'
import { ProductService } from '@/service/ProductService'

const customer1 = ref(null)
const customer2 = ref(null)
const customer3 = ref(null)
const filters1 = ref(null)
const loading1 = ref(null)
const loading2 = ref(null)
const idFrozen = ref(false)
const products = ref(null)
const expandedRows = ref([])
const statuses = reactive(['unqualified', 'qualified', 'new', 'negotiation', 'renewal', 'proposal'])

const summaryinfo = ref(null)
const summaryinfoService = new ProductService()

const customerService = new CustomerService()
const productService = new ProductService()

const getStateSeverity = (status) => {
  switch (status) {
    case 'charge':
      return 'success'

    case 'discharge':
      return 'success'

    case 'idle':
      return 'info'

    default:
      return 'danger'
  }
}

const getFaultSeverity = (status) => {
  switch (status) {
    case 'slight':
      return 'info'

    case 'ordinary':
      return 'warning'

    case 'severity':
      return 'danger'

    default:
      return 'success'
  }
}

onBeforeMount(() => {
  productService.getProductsWithOrdersSmall().then((data) => (products.value = data))
  summaryinfoService.getProductsVoltTemp().then((data) => (summaryinfo.value = data))
  customerService.getCustomersLarge().then((data) => {
    customer1.value = data
    loading1.value = false
    customer1.value.forEach((customer) => (customer.date = new Date(customer.date)))
  })
  customerService.getCustomersLarge().then((data) => (customer2.value = data))
  customerService.getCustomersMedium().then((data) => (customer3.value = data))
  loading2.value = false

  initFilters1()
})

const initFilters1 = () => {
  filters1.value = {
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    name: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    'country.name': {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    representative: { value: null, matchMode: FilterMatchMode.IN },
    date: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }]
    },
    balance: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    status: {
      operator: FilterOperator.OR,
      constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    activity: { value: [0, 100], matchMode: FilterMatchMode.BETWEEN },
    verified: { value: null, matchMode: FilterMatchMode.EQUALS }
  }
}

const clearFilter1 = () => {
  initFilters1()
}
const expandAll = () => {
  expandedRows.value = products.value.reduce((acc, p) => (acc[p.id] = true) && acc, {})
}
const collapseAll = () => {
  expandedRows.value = null
}
const formatCurrency = (value) => {
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const formatDate = (value) => {
  return value.toLocaleDateString('en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}
const calculateCustomerTotal = (name) => {
  let total = 0
  if (customer3.value) {
    for (let customer of customer3.value) {
      if (customer.representative.name === name) {
        total++
      }
    }
  }

  return total
}
</script>

<template>
  <div class="grid">
    <div class="col-12">
      <div class="card">
        <h5>Summary Info</h5>
        <DataTable
          :value="summaryinfo"
          resizableColumns
          showGridlines
          stripedRows
          scrollable
          scrollHeight="600px"
        >
          <Column field="id" header="Rack" frozen class="font-bold">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.id.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="Charge State" frozen class="font-bold">
            <template #body="{ data }">
              <Tag class="flex" :severity="getStateSeverity(data.state)"
                >{{ data.state.toUpperCase() }}
              </Tag>
            </template>
          </Column>
          <Column header="Fault State" frozen class="font-bold">
            <template #body="{ data }">
              <Tag class="flex" :severity="getFaultSeverity(data.fault)"
                >{{ data.fault.toUpperCase() }}
              </Tag>
            </template>
          </Column>
          <Column header="Volt(V)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="Current(A)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="SOC(%)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="Ava. Eng(kWH)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="MaxCPow(kW)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="MaxDCPow(kW)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="IResistance(kΩ)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="Accu. CEng(kWH)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="Accu. DCEng(kWH)">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <div class="col-12">
      <div class="card">
        <h5>Extreme Info</h5>
        <DataTable
          :value="summaryinfo"
          resizableColumns
          showGridlines
          stripedRows
          scrollable
          scrollHeight="600px"
        >
          <Column field="id" header="Rack" frozen class="font-bold" sortable>
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.id.toUpperCase() }}</i>
            </template>
          </Column>
          <Column field="maxvolt" header="Max Volt(V)" sortable>
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxvolt.toUpperCase() }}</i>
            </template>
          </Column>
          <Column field="minvolt" header="Min Volt(V)" sortable>
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.minvolt.toUpperCase() }}</i>
            </template>
          </Column>
          <Column field="maxtemp" header="Max Temp(℃)" sortable>
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column field="mintemp" header="Min Temp(℃)" sortable>
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.mintemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="MaxVoltID">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxvolt.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="MinVoltID">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.minvolt.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="MaxTempID">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.maxtemp.toUpperCase() }}</i>
            </template>
          </Column>
          <Column header="MinTempID">
            <template #body="{ data }">
              <i class="flex justify-content-center">{{ data.mintemp.toUpperCase() }}</i>
            </template>
          </Column>
        </DataTable>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.p-datatable-frozen-tbody) {
  font-weight: bold;
}

:deep(.p-datatable-scrollable .p-frozen-column) {
  font-weight: bold;
}
</style>
