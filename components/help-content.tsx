"use client";

interface HelpContentProps {
  helpTab: "text" | "path" | "jq";
  setHelpTab: (tab: "text" | "path" | "jq") => void;
}

export function HelpContent({ helpTab, setHelpTab }: HelpContentProps) {
  return (
    <div className="w-full">
      {/* Custom Tab Headers */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
        <button
          onClick={() => setHelpTab("text")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            helpTab === "text"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          Text Search
        </button>
        <button
          onClick={() => setHelpTab("path")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            helpTab === "path"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          JSON Path
        </button>
        <button
          onClick={() => setHelpTab("jq")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            helpTab === "jq"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          JQ Queries
        </button>
      </div>

      {/* Tab Content */}
      {helpTab === "text" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Text Search</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Search for exact text matches within the JSON content.
            Case-insensitive.
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Examples:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    email
                  </code>{" "}
                  - Find all lines containing "email"
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    john.doe
                  </code>{" "}
                  - Find specific email addresses
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    2024
                  </code>{" "}
                  - Find dates from 2024
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    error
                  </code>{" "}
                  - Find error messages
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {helpTab === "path" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">JSON Path Search</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Search for specific JSON paths using dot notation and array indices.
          </p>
          <div className="space-y-3">
            <div>
              <h4 className="font-medium">Examples:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    user.name
                  </code>{" "}
                  - Find user name properties
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    users[0]
                  </code>{" "}
                  - Find first user in users array
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    data.items
                  </code>{" "}
                  - Find items arrays in data objects
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    config.settings.theme
                  </code>{" "}
                  - Find nested theme settings
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    products[2].price
                  </code>{" "}
                  - Find price of third product
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {helpTab === "jq" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">JQ Queries</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Use powerful jq syntax for complex JSON transformations and
            filtering.
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">Basic Selection:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .
                  </code>{" "}
                  - Return entire JSON
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .name
                  </code>{" "}
                  - Get the name field
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .users[0]
                  </code>{" "}
                  - Get first user
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .data.items[]
                  </code>{" "}
                  - Get all items in data
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">Filtering & Selection:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | select(.age {">"} 25)
                  </code>{" "}
                  - Users older than 25
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | select(.status == "active")
                  </code>{" "}
                  - Active items only
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .products[] | select(.price {"<"} 100)
                  </code>{" "}
                  - Cheap products
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | select(.name | contains("john"))
                  </code>{" "}
                  - Names containing "john"
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">Transformation:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | .name
                  </code>{" "}
                  - Extract all names
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | {`{name, email}`}
                  </code>{" "}
                  - Extract name and email only
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | .price * 1.1
                  </code>{" "}
                  - Add 10% to all prices
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[].tags[]
                  </code>{" "}
                  - Flatten all tags
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">Wildcards & Pattern Matching:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[]
                  </code>{" "}
                  - Iterate over all array elements or object values
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .data[]?
                  </code>{" "}
                  - Optional iterator (won't fail if data doesn't exist)
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .data | keys
                  </code>{" "}
                  - Get all keys from the .data object
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | select(.name | test("^user.*"))
                  </code>{" "}
                  - Regex: names starting with "user"
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | select(.email | endswith(".com"))
                  </code>{" "}
                  - Emails ending with ".com"
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .. | .name?
                  </code>{" "}
                  - Recursive descent: find all "name" fields at any depth
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | paths | select(.[-1] == "id")
                  </code>{" "}
                  - Find all paths ending with "id"
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">Aggregation:</h4>
              <ul className="text-sm space-y-1 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    length
                  </code>{" "}
                  - Count items in array
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    .[] | .price | add
                  </code>{" "}
                  - Sum all prices
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    group_by(.category)
                  </code>{" "}
                  - Group by category
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                    map(.price) | max
                  </code>{" "}
                  - Find highest price
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium">Complex Examples:</h4>
              <ul className="text-sm space-y-2 ml-4">
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    .users[] | select(.age {">"} 21) | {`{name, email}`}
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Get name/email of users over 21
                  </span>
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    .products[] | select(.price {"<"} 50 and .category ==
                    "books")
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Find cheap books
                  </span>
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    .orders[] | .items[] | select(.quantity {">"} 1)
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Find bulk order items
                  </span>
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    [.[] | select(.created_at | startswith("2024"))] | length
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Count items created in 2024
                  </span>
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    .. | select(type == "string" and test(".*@.*\\.com$"))
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Find all email addresses anywhere in the JSON
                  </span>
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    [.. | objects | with_entries(select(.key | test("^temp")))]
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Find all objects with keys starting with "temp"
                  </span>
                </li>
                <li>
                  <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                    .[] | select(.tags[]? | test(".*prod.*"))
                  </code>
                  <br />
                  <span className="text-xs text-gray-500">
                    Find items with any tag containing "prod"
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
