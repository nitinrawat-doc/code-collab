/**
 * data/seed.js
 * Seeds 10 DSA problems into MongoDB.
 * Run with: npm run seed
 */
require('../config/env');
const mongoose = require('mongoose');
const Problem = require('../models/Problem');
const { MONGO_URI } = require('../config/env');

const problems = [
  {
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['array', 'hash-table'],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return *indices of the two numbers such that they add up to target*.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.`,
    constraints: `- \`2 <= nums.length <= 10^4\`\n- \`-10^9 <= nums[i] <= 10^9\`\n- \`-10^9 <= target <= 10^9\`\n- Only one valid answer exists.`,
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'nums[0] + nums[1] = 2 + 7 = 9' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    starterCode: {
      javascript: `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n  // Your solution here\n};\n\n// Read input\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconst nums = JSON.parse(lines[0]);\nconst target = parseInt(lines[1]);\nconsole.log(JSON.stringify(twoSum(nums, target)));`,
      python: `def twoSum(nums, target):\n    # Your solution here\n    pass\n\nimport sys\nlines = sys.stdin.read().strip().split('\\n')\nnums = eval(lines[0])\ntarget = int(lines[1])\nprint(twoSum(nums, target))`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nvector<int> twoSum(vector<int>& nums, int target) {\n    // Your solution here\n}\nint main() {\n    // parse and call twoSum\n    return 0;\n}`,
      java: `import java.util.*;\npublic class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your solution here\n        return new int[]{};\n    }\n}`,
    },
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false },
      { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true },
    ],
  },
  {
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    tags: ['string', 'stack'],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.`,
    constraints: `- \`1 <= s.length <= 10^4\`\n- \`s\` consists of parentheses only \`'()[]{}'.\``,
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    starterCode: {
      javascript: `/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isValid(s) {\n  // Your solution here\n};\n\nconst s = require('fs').readFileSync('/dev/stdin','utf8').trim();\nconsole.log(isValid(s));`,
      python: `def isValid(s: str) -> bool:\n    # Your solution here\n    pass\n\nimport sys\ns = sys.stdin.read().strip()\nprint(isValid(s))`,
      cpp: `#include <bits/stdc++.h>\nusing namespace std;\nbool isValid(string s) {\n    // Your solution here\n    return false;\n}\nint main() {\n    string s; cin >> s;\n    cout << (isValid(s) ? "true" : "false") << endl;\n}`,
      java: `public class Solution {\n    public boolean isValid(String s) {\n        // Your solution here\n        return false;\n    }\n}`,
    },
    testCases: [
      { input: '()', expectedOutput: 'true', isHidden: false },
      { input: '()[]{}"', expectedOutput: 'true', isHidden: false },
      { input: '(]', expectedOutput: 'false', isHidden: false },
      { input: '{[]}', expectedOutput: 'true', isHidden: true },
    ],
  },
  {
    slug: 'reverse-linked-list',
    title: 'Reverse Linked List',
    difficulty: 'Easy',
    tags: ['linked-list', 'recursion'],
    description: `Given the \`head\` of a singly linked list, reverse the list, and return the reversed list.`,
    constraints: `- The number of nodes is in the range \`[0, 5000]\`.\n- \`-5000 <= Node.val <= 5000\``,
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
      { input: 'head = [1,2]', output: '[2,1]' },
    ],
    starterCode: {
      javascript: `function reverseList(head) {\n  // Your solution here\n};`,
      python: `def reverseList(head):\n    # Your solution here\n    pass`,
      cpp: `ListNode* reverseList(ListNode* head) {\n    // Your solution here\n    return nullptr;\n}`,
      java: `public ListNode reverseList(ListNode head) {\n    // Your solution here\n    return null;\n}`,
    },
    testCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]', isHidden: false },
      { input: '[1,2]', expectedOutput: '[2,1]', isHidden: false },
    ],
  },
  {
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    description: `Given an integer array \`nums\`, find the subarray with the largest sum, and return its sum.`,
    constraints: `- \`1 <= nums.length <= 10^5\`\n- \`-10^4 <= nums[i] <= 10^4\``,
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1' },
    ],
    starterCode: {
      javascript: `function maxSubArray(nums) {\n  // Your solution here\n};\n\nconst nums = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim());\nconsole.log(maxSubArray(nums));`,
      python: `def maxSubArray(nums):\n    # Your solution here\n    pass\n\nimport sys\nnums = eval(sys.stdin.read().strip())\nprint(maxSubArray(nums))`,
      cpp: `int maxSubArray(vector<int>& nums) {\n    // Your solution here\n    return 0;\n}`,
      java: `public int maxSubArray(int[] nums) {\n    // Your solution here\n    return 0;\n}`,
    },
    testCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: false },
      { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true },
    ],
  },
  {
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    tags: ['math', 'dynamic-programming', 'memoization'],
    description: `You are climbing a staircase. It takes \`n\` steps to reach the top.

Each time you can either climb \`1\` or \`2\` steps. In how many distinct ways can you climb to the top?`,
    constraints: `- \`1 <= n <= 45\``,
    examples: [
      { input: 'n = 2', output: '2', explanation: '1. 1 step + 1 step  2. 2 steps' },
      { input: 'n = 3', output: '3', explanation: '1. 1+1+1  2. 1+2  3. 2+1' },
    ],
    starterCode: {
      javascript: `function climbStairs(n) {\n  // Your solution here\n};\n\nconst n = parseInt(require('fs').readFileSync('/dev/stdin','utf8').trim());\nconsole.log(climbStairs(n));`,
      python: `def climbStairs(n: int) -> int:\n    # Your solution here\n    pass\n\nimport sys\nn = int(sys.stdin.read().strip())\nprint(climbStairs(n))`,
      cpp: `int climbStairs(int n) {\n    // Your solution here\n    return 0;\n}`,
      java: `public int climbStairs(int n) {\n    // Your solution here\n    return 0;\n}`,
    },
    testCases: [
      { input: '2', expectedOutput: '2', isHidden: false },
      { input: '3', expectedOutput: '3', isHidden: false },
      { input: '10', expectedOutput: '89', isHidden: true },
    ],
  },
  {
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    tags: ['array', 'binary-search'],
    description: `Given an array of integers \`nums\` which is sorted in ascending order, and an integer \`target\`, write a function to search \`target\` in \`nums\`. If \`target\` exists, then return its index. Otherwise, return \`-1\`.

You must write an algorithm with \`O(log n)\` runtime complexity.`,
    constraints: `- \`1 <= nums.length <= 10^4\`\n- All integers are unique.\n- \`nums\` is sorted in ascending order.`,
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
    ],
    starterCode: {
      javascript: `function search(nums, target) {\n  // Your solution here\n};\n\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconsole.log(search(JSON.parse(lines[0]), parseInt(lines[1])));`,
      python: `def search(nums, target: int) -> int:\n    # Your solution here\n    pass\n\nimport sys\nlines = sys.stdin.read().strip().split('\\n')\nprint(search(eval(lines[0]), int(lines[1])))`,
      cpp: `int search(vector<int>& nums, int target) {\n    // Your solution here\n    return -1;\n}`,
      java: `public int search(int[] nums, int target) {\n    // Your solution here\n    return -1;\n}`,
    },
    testCases: [
      { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', isHidden: false },
      { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', isHidden: false },
    ],
  },
  {
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    tags: ['array', 'sorting'],
    description: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals, and return an array of the non-overlapping intervals that cover all the intervals in the input.`,
    constraints: `- \`1 <= intervals.length <= 10^4\`\n- \`intervals[i].length == 2\`\n- \`0 <= start_i <= end_i <= 10^4\``,
    examples: [
      { input: 'intervals = [[1,3],[2,6],[8,10],[15,18]]', output: '[[1,6],[8,10],[15,18]]' },
      { input: 'intervals = [[1,4],[4,5]]', output: '[[1,5]]' },
    ],
    starterCode: {
      javascript: `function merge(intervals) {\n  // Your solution here\n};\n\nconst intervals = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim());\nconsole.log(JSON.stringify(merge(intervals)));`,
      python: `def merge(intervals):\n    # Your solution here\n    pass\n\nimport sys\nintervals = eval(sys.stdin.read().strip())\nprint(merge(intervals))`,
      cpp: `vector<vector<int>> merge(vector<vector<int>>& intervals) {\n    // Your solution here\n    return {};\n}`,
      java: `public int[][] merge(int[][] intervals) {\n    // Your solution here\n    return new int[][]{};\n}`,
    },
    testCases: [
      { input: '[[1,3],[2,6],[8,10],[15,18]]', expectedOutput: '[[1,6],[8,10],[15,18]]', isHidden: false },
      { input: '[[1,4],[4,5]]', expectedOutput: '[[1,5]]', isHidden: false },
    ],
  },
  {
    slug: 'longest-common-prefix',
    title: 'Longest Common Prefix',
    difficulty: 'Easy',
    tags: ['string', 'trie'],
    description: `Write a function to find the longest common prefix string amongst an array of strings.

If there is no common prefix, return an empty string \`""\`.`,
    constraints: `- \`1 <= strs.length <= 200\`\n- \`0 <= strs[i].length <= 200\`\n- \`strs[i]\` consists of only lowercase English letters.`,
    examples: [
      { input: 'strs = ["flower","flow","flight"]', output: '"fl"' },
      { input: 'strs = ["dog","racecar","car"]', output: '""' },
    ],
    starterCode: {
      javascript: `function longestCommonPrefix(strs) {\n  // Your solution here\n};\n\nconst strs = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim());\nconsole.log(longestCommonPrefix(strs));`,
      python: `def longestCommonPrefix(strs):\n    # Your solution here\n    pass\n\nimport sys\nimport json\nstrs = json.loads(sys.stdin.read().strip())\nprint(longestCommonPrefix(strs))`,
      cpp: `string longestCommonPrefix(vector<string>& strs) {\n    // Your solution here\n    return "";\n}`,
      java: `public String longestCommonPrefix(String[] strs) {\n    // Your solution here\n    return "";\n}`,
    },
    testCases: [
      { input: '["flower","flow","flight"]', expectedOutput: 'fl', isHidden: false },
      { input: '["dog","racecar","car"]', expectedOutput: '', isHidden: false },
    ],
  },
  {
    slug: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    tags: ['array', 'depth-first-search', 'breadth-first-search', 'union-find'],
    description: `Given an \`m x n\` 2D binary grid \`grid\` which represents a map of \`'1'\`s (land) and \`'0'\`s (water), return the number of islands.

An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically. You may assume all four edges of the grid are all surrounded by water.`,
    constraints: `- \`m == grid.length\`\n- \`n == grid[i].length\`\n- \`1 <= m, n <= 300\`\n- \`grid[i][j]\` is \`'0'\` or \`'1'\`.`,
    examples: [
      { input: 'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', output: '1' },
    ],
    starterCode: {
      javascript: `function numIslands(grid) {\n  // Your solution here\n};\n\nconst grid = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8').trim());\nconsole.log(numIslands(grid));`,
      python: `def numIslands(grid):\n    # Your solution here\n    pass\n\nimport sys, json\ngrid = json.loads(sys.stdin.read().strip())\nprint(numIslands(grid))`,
      cpp: `int numIslands(vector<vector<char>>& grid) {\n    // Your solution here\n    return 0;\n}`,
      java: `public int numIslands(char[][] grid) {\n    // Your solution here\n    return 0;\n}`,
    },
    testCases: [
      { input: '[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]', expectedOutput: '1', isHidden: false },
      { input: '[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]', expectedOutput: '3', isHidden: true },
    ],
  },
  {
    slug: 'word-search',
    title: 'Word Search',
    difficulty: 'Medium',
    tags: ['array', 'backtracking', 'depth-first-search', 'matrix'],
    description: `Given an \`m x n\` grid of characters \`board\` and a string \`word\`, return \`true\` if \`word\` exists in the grid.

The word can be constructed from letters of sequentially adjacent cells, where adjacent cells are horizontally or vertically neighboring. The same letter cell may not be used more than once.`,
    constraints: `- \`m == board.length\`\n- \`n = board[i].length\`\n- \`1 <= m, n <= 6\`\n- \`1 <= word.length <= 15\``,
    examples: [
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "ABCCED"', output: 'true' },
      { input: 'board = [["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]], word = "SEE"', output: 'true' },
    ],
    starterCode: {
      javascript: `function exist(board, word) {\n  // Your solution here\n};\n\nconst lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconsole.log(exist(JSON.parse(lines[0]), lines[1]));`,
      python: `def exist(board, word: str) -> bool:\n    # Your solution here\n    pass\n\nimport sys, json\nlines = sys.stdin.read().strip().split('\\n')\nprint(exist(json.loads(lines[0]), lines[1]))`,
      cpp: `bool exist(vector<vector<char>>& board, string word) {\n    // Your solution here\n    return false;\n}`,
      java: `public boolean exist(char[][] board, String word) {\n    // Your solution here\n    return false;\n}`,
    },
    testCases: [
      { input: '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\nABCCED', expectedOutput: 'true', isHidden: false },
      { input: '[["A","B","C","E"],["S","F","C","S"],["A","D","E","E"]]\nABCB', expectedOutput: 'false', isHidden: true },
    ],
  },
];

const seed = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('[seed] Connected to MongoDB');

    await Problem.deleteMany({});
    const inserted = await Problem.insertMany(problems);
    console.log(`[seed] Inserted ${inserted.length} problems`);

    await mongoose.disconnect();
    console.log('[seed] Done');
  } catch (err) {
    console.error('[seed] Error:', err.message);
    process.exit(1);
  }
};

seed();
