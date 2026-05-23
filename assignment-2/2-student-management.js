const studentRecord = {
  name: "Priya Sharma",
  rollNumber: 202,
  marks: {
    mathematics: 82,
    science: 76,
    english: 88,
    computer: 91,
  },
};

const totalMarks =
  studentRecord.marks.mathematics +
  studentRecord.marks.science +
  studentRecord.marks.english +
  studentRecord.marks.computer;

const averageMarks = totalMarks / 4;

let grade = "";
if (averageMarks >= 90) {
  grade = "A+";
} else if (averageMarks >= 80) {
  grade = "A";
} else if (averageMarks >= 70) {
  grade = "B";
} else if (averageMarks >= 60) {
  grade = "C";
} else if (averageMarks >= 50) {
  grade = "D";
} else {
  grade = "Fail";
}

console.log("Student Name:", studentRecord.name);
console.log("Roll Number:", studentRecord.rollNumber);
console.log("Marks:", studentRecord.marks);
console.log("Total Marks:", totalMarks);
console.log("Average Marks:", averageMarks.toFixed(2));
console.log("Grade:", grade);
