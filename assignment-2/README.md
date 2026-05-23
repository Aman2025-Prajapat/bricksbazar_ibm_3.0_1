# Assignment 2

This folder contains a ready-to-submit version of Assignment 2 based on the reference topics, but with different data, variable names, and presentation.

## Files Included

1. `1-array-operations.js`
   Array operations program to find highest value, lowest value, average, and values greater than 60.

2. `2-student-management.js`
   Object-based student report program with total, average, and grade calculation.

3. `3-dynamic-color-changer.html`
   Web page that changes the background gradient dynamically on button click.

4. `4-fetch-public-api.html`
   Web page that fetches and displays post data from a public API using `fetch()`.

5. `5-weather-app-async-await.html`
   Weather app using `async/await` and the Open-Meteo API.

## Expected Output

### 1) Array Operations Program

```text
Monthly sales array: [
  18, 42, 65, 27, 91,
  33, 74, 56, 88, 49
]
Highest sale: 91
Lowest sale: 18
Average sale: 54.30
Sales greater than 60:
65
91
74
88
```

### 2) Object-Based Student Management

```text
Student Name: Priya Sharma
Roll Number: 202
Marks: { mathematics: 82, science: 76, english: 88, computer: 91 }
Total Marks: 337
Average Marks: 84.25
Grade: A
```

### 3) Dynamic Color Changer

Output:
When the button is clicked, the page background changes to a new random gradient and the selected color codes are displayed on the screen.

### 4) Fetch Data from Public API

Output:
The page loads six posts from `jsonplaceholder.typicode.com` and displays each post title and description inside separate cards.

### 5) Weather App using Async/Await

Output:
When the user enters a city name, the page shows the current temperature, condition, humidity, and wind speed for that location. If the city name is invalid, an error message is shown.

## How to Run

- For JavaScript files:
  Run `node 1-array-operations.js` and `node 2-student-management.js` from this folder.

- For HTML files:
  Open the `.html` files in a browser.
