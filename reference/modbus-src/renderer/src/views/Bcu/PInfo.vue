<script setup>
import { ref, watch, computed, onBeforeMount, reactive } from 'vue';
import { FilterMatchMode, FilterOperator } from 'primevue/api';
import { CustomerService } from '@/service/CustomerService';
import { ProductService } from '@/service/ProductService';

const barData = ref(null);
const barOptions = ref(null);
const customer1 = ref(null);
const customer2 = ref(null);
const customer3 = ref(null);
const filters1 = ref(null);
const loading1 = ref(null);
const loading2 = ref(null);
const idFrozen = ref(false);
const products = ref(null);
const expandedRows = ref([]);
const statuses = reactive(['unqualified', 'qualified', 'new', 'negotiation', 'renewal', 'proposal']);
const representatives = reactive([
    { name: 'Amy Elsner', image: 'amyelsner.png' },
    { name: 'Anna Fali', image: 'annafali.png' },
    { name: 'Asiya Javayant', image: 'asiyajavayant.png' },
    { name: 'Bernardo Dominic', image: 'bernardodominic.png' },
    { name: 'Elwin Sharvill', image: 'elwinsharvill.png' },
    { name: 'Ioni Bowcher', image: 'ionibowcher.png' },
    { name: 'Ivan Magalhaes', image: 'ivanmagalhaes.png' },
    { name: 'Onyama Limba', image: 'onyamalimba.png' },
    { name: 'Stephen Shaw', image: 'stephenshaw.png' },
    { name: 'XuXue Feng', image: 'xuxuefeng.png' }
]);

let documentStyle = getComputedStyle(document.documentElement);
let textColor = documentStyle.getPropertyValue('--text-color');
let textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
let surfaceBorder = documentStyle.getPropertyValue('--surface-border');

const setColorOptions = () => {
    documentStyle = getComputedStyle(document.documentElement);
    textColor = documentStyle.getPropertyValue('--text-color');
    textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    surfaceBorder = documentStyle.getPropertyValue('--surface-border');
};

// 假设这是你的原始数据数组
const dataArray = ref([
    { month: '1#', value1: 65, value2: 28 },
    { month: '2#', value1: 65, value2: null },
    { month: '3#', value1: 40, value2: null }
]);

// 提取labels
const labels = ref(dataArray.value.map(item => item.month));

// 提取datasets
const datasets = ref([
    {
        label: 'Volt',
        backgroundColor: documentStyle.getPropertyValue('--primary-500'),
        borderColor: documentStyle.getPropertyValue('--primary-500'),
        data: dataArray.value.map(item => item.value1)
    },
    {
        label: 'Temp',
        backgroundColor: documentStyle.getPropertyValue('--primary-200'),
        borderColor: documentStyle.getPropertyValue('--primary-200'),
        data: dataArray.value.map(item => item.value2)
    }
]);
// 这里我们不需要直接使用documentStyle.getPropertyValue，因为这样做不会创建响应式连接
// 相反，我们可以在计算属性内部获取这些值（如果它们不会变化，或者你愿意在变化时手动更新datasets）
// const datasets = computed(() => {
//   const primary500 = documentStyle.getPropertyValue('--primary-500');
//   const primary200 = documentStyle.getPropertyValue('--primary-200');
 
//   return [
//     {
//       label: 'Volt',
//       backgroundColor: primary500,
//       borderColor: primary500,
//       data: dataArray.map(item => item.value1)
//     },
//     {
//       label: 'Temp',
//       backgroundColor: primary200,
//       borderColor: primary200,
//       data: dataArray.map(item => item.value2)
//     }
//   ];
// });

// 现在你可以将labels和datasets赋值给barData.value
// barData.value = { labels, datasets };

const setChart = () => {
    barData.value = { labels, datasets };
    barOptions.value = {
        indexAxis: 'y',
        plugins: {
            legend: {
                labels: {
                    fontColor: textColor
                }
            }
        },
        scales: {
            x: {
                ticks: {
                    color: textColorSecondary,
                    font: {
                        weight: 500
                    }
                },
                grid: {
                    display: false,
                    drawBorder: false
                }
            },
            y: {
                ticks: {
                    color: textColorSecondary
                },
                grid: {
                    color: surfaceBorder,
                    drawBorder: false
                }
            }
        }
    };
};

const summaryinfo = ref(null);
const summaryinfoService = new ProductService();

const customerService = new CustomerService();
const productService = new ProductService();

const getBadgeSeverity = (inventoryStatus) => {
    switch (inventoryStatus.toLowerCase()) {
        case 'instock':
            return 'success';
        case 'lowstock':
            return 'warning';
        case 'outofstock':
            return 'danger';
        default:
            return 'info';
    }
};
const getSeverity = (status) => {
    switch (status) {
        case 'unqualified':
            return 'danger';

        case 'qualified':
            return 'success';

        case 'new':
            return 'info';

        case 'negotiation':
            return 'warning';

        case 'renewal':
            return null;
    }
};

const getStateSeverity = (status) => {
    switch (status) {
        case 'charge':
            return 'success';

        case 'discharge':
            return 'success';

        case 'idle':
            return 'info';

        default:
            return 'danger';
    }
};

const getFaultSeverity = (status) => {
    switch (status) {
        case 'slight':
            return 'info';

        case 'ordinary':
            return 'warning';

        case 'severity':
            return 'danger';

        default:
            return 'success';
    }
};

function updateTime() {
    // dataArray = [{ month: '1#', value1: 65, value2: 28 }]
    // barData.value = { labels, datasets };
    
    // dataArray.value.push({ month: '2#', value1: 59, value2: 48 })
    if (dataArray.value[0].value1 == 65) {
        dataArray.value[0].value1 = 35

        // 手动更新datasets中的相应数据
        datasets.value.forEach(dataset => {
            if (dataset.label === 'Volt') {
                dataset.data[0] = 35;
            }
        });
        barData.value.update()
        // datasets.value[0].data[0].value1 = 35
        console.log(barData.value)
        

    }
    else {
        dataArray.value[0].value1 = 65
        // datasets.value[0].data[0].value1 = 65

        // 手动更新datasets中的相应数据
        datasets.value.forEach(dataset => {
            if (dataset.label === 'Volt') {
                dataset.data[0] = 65;
            }
        });
    }
    // mychart.update()
    // labels.value = dataArray.map(item => item.month)
    // datasets.value = [
    // {
    //     label: 'Volt',
    //     backgroundColor: documentStyle.getPropertyValue('--primary-500'),
    //     borderColor: documentStyle.getPropertyValue('--primary-500'),
    //     data: dataArray.map(item => item.value1)
    // },
    // {
    //     label: 'Temp',
    //     backgroundColor: documentStyle.getPropertyValue('--primary-200'),
    //     borderColor: documentStyle.getPropertyValue('--primary-200'),
    //     data: dataArray.map(item => item.value2)
    // }
    // ];

    // console.log('1#     1#')
    // console.log(dataArray)

}

let timerId = null;
function startTimer() {
    if (timerId == null) {
        timerId = setInterval(updateTime, 5000);
    }
}

// watch(
//     dataArray.value,
//     () => {
//         labels.value = dataArray.value.map(item => item.month)
//         datasets.value[0].data = dataArray.value.map(item => item.value1)
//         datasets.value[1].data = dataArray.value.map(item => item.value2)
//     //     datasets.value = [
//     // {
//     //     label: 'Volt',
//     //     backgroundColor: documentStyle.getPropertyValue('--primary-500'),
//     //     borderColor: documentStyle.getPropertyValue('--primary-500'),
//     //     data: dataArray.value.map(item => item.value1)
//     // },
//     // {
//     //     label: 'Temp',
//     //     backgroundColor: documentStyle.getPropertyValue('--primary-200'),
//     //     borderColor: documentStyle.getPropertyValue('--primary-200'),
//     //     data: dataArray.value.map(item => item.value2)
//     // }
//     // ];

//         console.log('2#     2#')
//         console.log(barData)
//     },
//     { immediate: true }
// );

onBeforeMount(() => {
    setColorOptions()
    setChart()
    startTimer()

    productService.getProductsWithOrdersSmall().then((data) => (products.value = data));
    summaryinfoService.getProductsVoltTemp().then((data) => (summaryinfo.value = data));
    customerService.getCustomersLarge().then((data) => {
        customer1.value = data;
        loading1.value = false;
        customer1.value.forEach((customer) => (customer.date = new Date(customer.date)));
    });
    customerService.getCustomersLarge().then((data) => (customer2.value = data));
    customerService.getCustomersMedium().then((data) => (customer3.value = data));
    loading2.value = false;

    initFilters1();
});

const initFilters1 = () => {
    filters1.value = {
        global: { value: null, matchMode: FilterMatchMode.CONTAINS },
        name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        'country.name': { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
        representative: { value: null, matchMode: FilterMatchMode.IN },
        date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
        balance: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        activity: { value: [0, 100], matchMode: FilterMatchMode.BETWEEN },
        verified: { value: null, matchMode: FilterMatchMode.EQUALS }
    };
};

const clearFilter1 = () => {
    initFilters1();
};
const expandAll = () => {
    expandedRows.value = products.value.reduce((acc, p) => (acc[p.id] = true) && acc, {});
};
const collapseAll = () => {
    expandedRows.value = null;
};
const formatCurrency = (value) => {
    return value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
};

const formatDate = (value) => {
    return value.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
const calculateCustomerTotal = (name) => {
    let total = 0;
    if (customer3.value) {
        for (let customer of customer3.value) {
            if (customer.representative.name === name) {
                total++;
            }
        }
    }

    return total;
};
</script>

<template>
    <div class="grid">
        <div class="col-12">
            <div class="card">
                <h5>Pack Info</h5>
                <DataTable :value="summaryinfo" resizableColumns showGridlines stripedRows scrollable
                    scrollHeight="600px">
                    <Column field="id" header="Rack" frozen class="font-bold">
                        <template #body="{ data }">
                            <i class="flex justify-content-center">{{ data.id.toUpperCase() }}</i>
                        </template>
                    </Column>
                    <Column header="Charge State" frozen class="font-bold">
                        <template #body="{ data }">
                            <Tag class="flex" :severity="getStateSeverity(data.state)">{{ data.state.toUpperCase() }}
                            </Tag>
                        </template>
                    </Column>
                    <Column header="Fault State" frozen class="font-bold">
                        <template #body="{ data }">
                            <Tag class="flex" :severity="getFaultSeverity(data.fault)">{{ data.fault.toUpperCase() }}
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
                <h5>Cell Info</h5>
                <Chart type="bar" id="mychart" :data="barData" :options="barOptions" ></Chart>
            </div>
        </div>

        <div class="col-12">
            <div class="card">
                <h5>Row Expand</h5>
                <DataTable :value="products" v-model:expandedRows="expandedRows" dataKey="id" tableStyle="min-width: 60rem">
                    <template #header>
                        <div>
                            <Button icon="pi pi-plus" label="Expand All" @click="expandAll" class="mr-2 mb-2" />
                            <Button icon="pi pi-minus" label="Collapse All" @click="collapseAll" class="mb-2" />
                        </div>
                    </template>
                    <Column :expander="true" headerStyle="width: 3rem" />
                    <Column field="name" header="Name" :sortable="true">
                        <template #body="slotProps">
                            {{ slotProps.data.name }}
                        </template>
                    </Column>
                    <Column header="Image">
                        <template #body="slotProps">
                            <img :src="'/demo/images/product/' + slotProps.data.image" :alt="slotProps.data.image" class="shadow-2" width="100" />
                        </template>
                    </Column>
                    <Column field="price" header="Price" :sortable="true">
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.price) }}
                        </template>
                    </Column>
                    <Column field="category" header="Category" :sortable="true">
                        <template #body="slotProps">
                            {{ formatCurrency(slotProps.data.category) }}
                        </template></Column
                    >
                    <Column field="rating" header="Reviews" :sortable="true">
                        <template #body="slotProps">
                            <Rating :modelValue="slotProps.data.rating" :readonly="true" :cancel="false" />
                        </template>
                    </Column>
                    <Column field="inventoryStatus" header="Status" :sortable="true">
                        <template #body="slotProps">
                            <Tag :severity="getBadgeSeverity(slotProps.data.inventoryStatus)">{{ slotProps.data.inventoryStatus }}</Tag>
                        </template>
                    </Column>
                    <template #expansion="slotProps">
                        <div class="p-3">
                            <h5>Orders for {{ slotProps.data.name }}</h5>
                            <DataTable :value="slotProps.data.orders">
                                <Column field="id" header="Id" :sortable="true">
                                    <template #body="slotProps">
                                        {{ slotProps.data.id }}
                                    </template>
                                </Column>
                                <Column field="customer" header="Customer" :sortable="true">
                                    <template #body="slotProps">
                                        {{ slotProps.data.customer }}
                                    </template>
                                </Column>
                                <Column field="date" header="Date" :sortable="true">
                                    <template #body="slotProps">
                                        {{ slotProps.data.date }}
                                    </template>
                                </Column>
                                <Column field="amount" header="Amount" :sortable="true">
                                    <template #body="slotProps">
                                        {{ formatCurrency(slotProps.data.amount) }}
                                    </template>
                                </Column>
                                <Column field="status" header="Status" :sortable="true">
                                    <template #body="slotProps">
                                        <span :class="'order-badge order-' + (slotProps.data.status ? slotProps.data.status.toLowerCase() : '')">{{ slotProps.data.status }}</span>
                                    </template>
                                </Column>
                                <Column headerStyle="width:4rem">
                                    <template #body>
                                        <Button icon="pi pi-search" />
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                    </template>
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