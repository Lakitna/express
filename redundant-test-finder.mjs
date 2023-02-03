import { readFile } from "node:fs/promises";
import { calculateMetrics } from "mutation-testing-metrics"; // A dependency of Stryker

const inputPath = "./reports/mutation/mutation.json";
const input = JSON.parse(await readFile(inputPath, "utf-8"));

const metrics = calculateMetrics(input.files).metrics;
console.log("Total mutants: " + metrics.totalValid);
console.log("Mutation coverage: " + metrics.mutationScore.toFixed(3) + "%");

// -----------------

const allMutants = Object.values(input.files)
  .map((file) => file.mutants)
  .flat();

const allTests = Object.entries(input.testFiles)
  .map(([filePath, file]) =>
    file.tests.map((t) => {
      return { ...t, filePath };
    })
  )
  .flat()
  .map((test) => {
    return {
      ...test,
      killedMutants: allMutants
        .filter((mutant) => mutant.coveredBy.includes(test.id))
        .sort((a, b) => {
          if (a.id > b.id) return -1;
          if (a.id < b.id) return 1;
          return 0;
        }),
    };
  });
console.log("Total tests: " + allTests.length);

// -----------------

const neverFailed = allTests.filter((t) => t.killedMutants.length === 0);

console.log("Tests that can't fail (0 mutants killed): " + neverFailed.length);
// console.log(neverFailed);

// -----------------

const testsWithDuplicates = allTests
  .filter((t) => t.killedMutants.length > 0)
  .map((thisTest) => {
    return {
      ...thisTest,
      duplicates: allTests.filter((otherTest) => {
        if (otherTest.id === thisTest.id) {
          return false;
        }
        if (otherTest.killedMutants.length !== thisTest.killedMutants.length) {
          return false;
        }

        // Crude and inefficient way to comparing which mutants are tested by each
        const thisKilledMutants = JSON.stringify(
          thisTest.killedMutants.map((m) => m.id)
        );
        const otherKilledMutants = JSON.stringify(
          otherTest.killedMutants.map((m) => m.id)
        );
        const match = thisKilledMutants === otherKilledMutants;

        return match;
      }),
    };
  })
  .filter((test) => test.duplicates.length > 0);

console.log(
  "Tests with at least 1 duplicate (same mutants covered): " +
    testsWithDuplicates.length
);
// console.log(testsWithDuplicates);
