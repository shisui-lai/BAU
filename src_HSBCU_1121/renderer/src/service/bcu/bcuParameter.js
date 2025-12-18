export class bcuParameter {
  getbcuParameter() {
    return fetch('demo/data/bcu/bcuParameter.json', { headers: { 'Cache-Control': 'no-cache' } })
      .then((res) => res.json())
      .then((d) => d.data)
  }
}
