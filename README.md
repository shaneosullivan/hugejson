# HugeJSON - Advanced JSON Viewer & Query Tool

A powerful, web-based JSON viewer designed specifically for handling very large JSON files with advanced querying capabilities and an intuitive user interface.

## What Makes HugeJSON Different

HugeJSON stands out from other JSON viewers with these unique features:

- **Massive File Support**: Optimized for very large JSON files that would crash other viewers
- **Advanced jq Integration**: Built-in jq query engine with an interactive query builder
- **Smart Virtualization**: Efficiently renders large datasets without performance issues
- **Intelligent Collapsing**: Automatically collapses large arrays and objects for better navigation
- **Educational Query Builder**: Learn jq through 50+ popular query patterns with guided inputs
- **Persistent Query Library**: Save and reuse your custom queries

## Key Features

### JSON Viewing & Navigation
- **Collapsible Tree View**: Expand/collapse any level of nested data
- **Virtual Scrolling**: Handle massive datasets without browser lag
- **Search & Filter**: Find specific keys or values instantly
- **Type Indicators**: Visual indicators for different data types
- **Copy Utilities**: Copy individual values, objects, or paths

### Advanced Querying with jq
- **Native jq Support**: Full jq query language support powered by jq-web
- **Interactive Query Builder**: Three ways to build queries:
  - **Popular Queries**: 50+ pre-built patterns with guided inputs
  - **Saved Queries**: Personal library of reusable queries
  - **Step-by-Step Builder**: Visual query construction with real-time preview

### Smart Performance
- **Intelligent Rendering**: Only renders visible portions of large datasets
- **Collapsibility Analysis**: Automatically identifies and collapses large structures
- **Memory Efficient**: Minimal memory footprint even with huge files
- **Progressive Loading**: Smooth experience regardless of file size

## How to Use

### Getting Started

1. **Load JSON Data**:
   - Paste JSON directly into the interface
   - Upload a JSON file
   - The viewer will automatically parse and display your data

2. **Navigate Your Data**:
   - Click the **�** arrows to expand/collapse sections
   - Use the search box to find specific content
   - Large arrays/objects are automatically collapsed for easier navigation

### Using the jq Query System

#### Method 1: Popular Queries (Recommended for Beginners)
1. Click the **=' Query Builder** button
2. Select the **Popular Queries** tab
3. Browse through 50+ common patterns like:
   - "Get property" - Extract specific fields
   - "Filter by value" - Find items matching criteria
   - "Sort by field" - Order results by any field
   - "Array operations" - First, last, slice operations
   - "String manipulation" - Split, replace, case conversion
4. Fill in the parameter fields (e.g., field names, values)
5. See the real-time query preview
6. Click **Use** to apply the query

#### Method 2: Step-by-Step Builder
1. Open the Query Builder and select **Step-by-Step**
2. Add operations one by one:
   - **Object Key** (.field) - Access object properties
   - **Array Index** (.[0]) - Get specific array elements
   - **Select** - Filter items by conditions
   - **Map** - Transform each item
   - **Sort/Group** - Organize results
3. Watch the query build in real-time
4. Save useful queries for later reuse

#### Method 3: Direct jq Input
1. Type jq queries directly in the search box
2. Examples:
   ```jq
   .users[0].name                    # Get first user's name
   .products | map(.price)           # Get all product prices
   .items[] | select(.status == "active")  # Filter active items
   ```

### Advanced Features

#### Saving & Reusing Queries
- In Step-by-Step mode, click **Save Query** to add to your library
- Access saved queries in the **Saved Queries** tab
- Queries persist between sessions using local storage
- Delete unwanted queries with the trash icon

#### Working with Large Files
- HugeJSON automatically optimizes display for large files
- Arrays/objects with 100+ items are collapsed by default
- Use targeted queries to extract specific data rather than expanding everything
- The search function works across the entire dataset efficiently

## Example Use Cases

### API Response Analysis
```jq
# Get all user emails from an API response
.data.users | map(.email)

# Find users in a specific city
.data.users[] | select(.address.city == "New York")
```

### Configuration File Processing
```jq
# Extract all database connection strings
.. | select(type == "object") | select(has("connectionString")) | .connectionString

# Find all enabled features
.features | to_entries | map(select(.value == true)) | map(.key)
```

### Data Transformation
```jq
# Transform user data for export
.users | map({
  id: .id,
  fullName: (.firstName + " " + .lastName),
  contact: .email
})
```

### Analytics & Reporting
```jq
# Calculate average order value
.orders | map(.total) | add / length

# Group sales by region
.sales | group_by(.region) | map({
  region: .[0].region,
  count: length,
  total: map(.amount) | add
})
```

## Popular Query Patterns

HugeJSON includes 50+ built-in query patterns covering:

### Basic Operations
- Identity, get keys/values, property access
- Array indexing, slicing, length

### Filtering & Selection
- Filter by value, contains, greater than
- Field existence checks, type filtering
- Null checks and default values

### Array Operations
- Sort, reverse, unique, flatten
- Min/max values, grouping
- Combining and splitting arrays

### Object Manipulation
- Add, delete, rename fields
- Merge objects, select specific keys
- Convert to/from key-value pairs

### String Operations
- Case conversion, length, splitting
- Find and replace, regex matching
- String parsing and formatting

### Advanced Patterns
- Recursive searches, path finding
- Conditional logic, aggregation
- Data transformation and reshaping

## Tips & Best Practices

### Performance Tips
- Use specific queries rather than expanding large sections manually
- Start with targeted filters before applying transformations
- Save frequently-used queries for quick access

### Query Building Tips
- Start with Popular Queries to learn jq syntax
- Use the Step-by-Step builder to understand query structure
- Build complex queries incrementally, testing each step

### Navigation Tips
- Use the search function to quickly locate specific data
- Leverage automatic collapsing for better overview of large files
- Copy specific values or paths when you need to reference them elsewhere

## Getting Started Locally

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Browser Support

HugeJSON works in all modern browsers:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

## Technical Details

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **jq Engine**: jq-web for client-side query processing
- **Performance**: Virtual scrolling and intelligent rendering
- **Storage**: Local storage for saved queries and preferences

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

[Add your license information here]

---

**HugeJSON** - Making large JSON files manageable and queryable.