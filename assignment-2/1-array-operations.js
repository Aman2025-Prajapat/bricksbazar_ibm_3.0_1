const monthlySales = [18, 42, 65, 27, 91, 33, 74, 56, 88, 49];

let highestSale = monthlySales[0];
for (let i = 1; i < monthlySales.length; i++) {
  if (monthlySales[i] > highestSale) {
    highestSale = monthlySales[i];
  }
}

let lowestSale = monthlySales[0];
for (let i = 1; i < monthlySales.length; i++) {
  if (monthlySales[i] < lowestSale) {
    lowestSale = monthlySales[i];
  }
}

let totalSales = 0;
for (let i = 0; i < monthlySales.length; i++) {
  totalSales += monthlySales[i];
}

const averageSale = totalSales / monthlySales.length;

console.log("Monthly sales array:", monthlySales);
console.log("Highest sale:", highestSale);
console.log("Lowest sale:", lowestSale);
console.log("Average sale:", averageSale.toFixed(2));

console.log("Sales greater than 60:");
for (let i = 0; i < monthlySales.length; i++) {
  if (monthlySales[i] > 60) {
    console.log(monthlySales[i]);
  }
}
