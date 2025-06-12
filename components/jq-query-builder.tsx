"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Minus, Copy, RotateCcw, AlertTriangle, Star, Save, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JqQueryBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (query: string) => void;
  initialQuery?: string;
}

interface QueryStep {
  id: string;
  type: string;
  value: string;
  operator?: string;
  selectField?: string;
  selectValue?: string;
}

interface PopularQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  inputs?: {
    name: string;
    placeholder: string;
    description: string;
  }[];
}

interface SavedQuery {
  id: string;
  name: string;
  description?: string;
  query: string;
  createdAt: string;
}

const STEP_TYPES = {
  general: [
    {
      value: "identity",
      label: "Identity (.)",
      description: "Pass through the input unchanged",
    },
    {
      value: "key",
      label: "Object Key (.key)",
      description: "Extract a specific key from objects",
    },
    {
      value: "iterate",
      label: "Iterate (.[])",
      description: "Iterate over array or object values",
    },
    {
      value: "recursive",
      label: "Recursive (..))",
      description: "Recursively apply to all values",
    },
    {
      value: "pipe",
      label: "Pipe (|)",
      description: "Pipe output to next operation",
    },
    {
      value: "select",
      label: "Select",
      description: "Select items matching condition",
    },
    {
      value: "map",
      label: "Map",
      description: "Apply operation to each element",
    },
    {
      value: "keys",
      label: "Keys",
      description: "Get object keys or array indices",
    },
    {
      value: "length",
      label: "Length",
      description: "Get length of array or object",
    },
    { value: "type", label: "Type", description: "Get type of value" },
    {
      value: "to_entries",
      label: "To Entries",
      description: "Convert object to key-value pairs",
    },
    {
      value: "from_entries", 
      label: "From Entries",
      description: "Convert key-value pairs back to object",
    },
  ],
  arrays: [
    {
      value: "index",
      label: "Array Index (.[0])",
      description: "Extract element at specific index",
    },
    {
      value: "slice",
      label: "Array Slice (.[1:3])",
      description: "Extract array slice",
    },
    { value: "sort", label: "Sort", description: "Sort array or object" },
    { value: "reverse", label: "Reverse", description: "Reverse array" },
    {
      value: "unique",
      label: "Unique",
      description: "Remove duplicates from array",
    },
    {
      value: "group_by",
      label: "Group By",
      description: "Group array elements by expression",
    },
  ],
};

const OPERATORS = [
  {
    value: "==",
    label: "Equal (==)",
    description: "Check if values are equal",
  },
  {
    value: "!=",
    label: "Not Equal (!=)",
    description: "Check if values are not equal",
  },
  {
    value: "<",
    label: "Less Than (<)",
    description: "Check if left is less than right",
  },
  {
    value: "<=",
    label: "Less or Equal (<=)",
    description: "Check if left is less than or equal to right",
  },
  {
    value: ">",
    label: "Greater Than (>)",
    description: "Check if left is greater than right",
  },
  {
    value: ">=",
    label: "Greater or Equal (>=)",
    description: "Check if left is greater than or equal to right",
  },
  {
    value: "contains",
    label: "Contains",
    description: "Check if array/string contains value",
  },
  {
    value: "startswith",
    label: "Starts With",
    description: "Check if string starts with value",
  },
  {
    value: "endswith",
    label: "Ends With",
    description: "Check if string ends with value",
  },
  {
    value: "test",
    label: "Test (regex)",
    description: "Test string against regular expression",
  },
];

const POPULAR_QUERIES: PopularQuery[] = [
  {
    id: "identity",
    name: "Identity (whole document)",
    description: "Return the entire input unchanged",
    query: ".",
  },
  {
    id: "get_keys",
    name: "Get all keys",
    description: "Extract all keys from an object",
    query: "keys",
  },
  {
    id: "get_values",
    name: "Get all values", 
    description: "Extract all values from an object or array",
    query: ".[]",
  },
  {
    id: "get_property",
    name: "Get property",
    description: "Extract a specific property from objects",
    query: ".{property}",
    inputs: [{
      name: "property",
      placeholder: "name",
      description: "Property name to extract"
    }]
  },
  {
    id: "get_nested_property",
    name: "Get nested property",
    description: "Extract a property from nested objects",
    query: ".{parent}.{child}",
    inputs: [
      {
        name: "parent", 
        placeholder: "user",
        description: "Parent object name"
      },
      {
        name: "child",
        placeholder: "name", 
        description: "Child property name"
      }
    ]
  },
  {
    id: "array_first",
    name: "First array element",
    description: "Get the first element of an array",
    query: ".[0]",
  },
  {
    id: "array_last", 
    name: "Last array element",
    description: "Get the last element of an array",
    query: ".[-1]",
  },
  {
    id: "array_slice",
    name: "Array slice",
    description: "Extract a slice of an array",
    query: ".[{start}:{end}]",
    inputs: [
      {
        name: "start",
        placeholder: "1",
        description: "Start index (inclusive)"
      },
      {
        name: "end", 
        placeholder: "3",
        description: "End index (exclusive)"
      }
    ]
  },
  {
    id: "array_length",
    name: "Array length",
    description: "Get the length of an array or object",
    query: "length",
  },
  {
    id: "filter_equal",
    name: "Filter by field value",
    description: "Select items where a specific field equals a value",
    query: ".[] | select(.{field} == \"{value}\")",
    inputs: [
      {
        name: "field",
        placeholder: "name",
        description: "Field name to check (e.g., name, status, type)"
      },
      {
        name: "value",
        placeholder: "John",
        description: "Value to match"
      }
    ]
  },
  {
    id: "filter_any_field",
    name: "Find value anywhere",
    description: "Search for a value in any field recursively",
    query: ".. | select(. == \"{value}\")?",
    inputs: [
      {
        name: "value",
        placeholder: "Address",
        description: "Value to search for in any field"
      }
    ]
  },
  {
    id: "filter_contains",
    name: "Filter by contains",
    description: "Select items where a field contains a substring",
    query: ".[] | select(.{field} | contains(\"{value}\"))",
    inputs: [
      {
        name: "field",
        placeholder: "name", 
        description: "Field name to check"
      },
      {
        name: "value",
        placeholder: "John",
        description: "Substring to find"
      }
    ]
  },
  {
    id: "filter_greater",
    name: "Filter by greater than",
    description: "Select items where a numeric field is greater than a value",
    query: ".[] | select(.{field} > {value})",
    inputs: [
      {
        name: "field",
        placeholder: "age",
        description: "Numeric field name"
      },
      {
        name: "value",
        placeholder: "25",
        description: "Minimum value"
      }
    ]
  },
  {
    id: "filter_exists",
    name: "Filter by field exists",
    description: "Select items that have a specific field",
    query: ".[] | select(has(\"{field}\"))",
    inputs: [{
      name: "field",
      placeholder: "email",
      description: "Field that must exist"
    }]
  },
  {
    id: "map_property",
    name: "Map to property",
    description: "Extract a specific property from each item in an array",
    query: ".[] | .{property}",
    inputs: [{
      name: "property",
      placeholder: "name",
      description: "Property to extract from each item"
    }]
  },
  {
    id: "map_object",
    name: "Map to new object",
    description: "Transform each item to a new object with selected fields", 
    query: ".[] | {name: .{field1}, value: .{field2}}",
    inputs: [
      {
        name: "field1",
        placeholder: "name",
        description: "First field to include"
      },
      {
        name: "field2", 
        placeholder: "value",
        description: "Second field to include"
      }
    ]
  },
  {
    id: "sort_by",
    name: "Sort by field",
    description: "Sort array elements by a specific field",
    query: "sort_by(.{field})",
    inputs: [{
      name: "field",
      placeholder: "name",
      description: "Field to sort by"
    }]
  },
  {
    id: "group_by",
    name: "Group by field", 
    description: "Group array elements by a specific field",
    query: "group_by(.{field})",
    inputs: [{
      name: "field",
      placeholder: "category",
      description: "Field to group by"
    }]
  },
  {
    id: "unique_values",
    name: "Unique values",
    description: "Remove duplicate values from an array",
    query: "unique",
  },
  {
    id: "reverse_array",
    name: "Reverse array",
    description: "Reverse the order of array elements", 
    query: "reverse",
  },
  {
    id: "flatten_array",
    name: "Flatten array",
    description: "Flatten nested arrays one level deep",
    query: "flatten(1)",
  },
  {
    id: "count_items",
    name: "Count items",
    description: "Count items in an array or object",
    query: "length",
  },
  {
    id: "sum_values",
    name: "Sum numeric values",
    description: "Calculate sum of numeric array elements",
    query: "add",
  },
  {
    id: "min_value",
    name: "Minimum value",
    description: "Find minimum value in an array",
    query: "min",
  },
  {
    id: "max_value", 
    name: "Maximum value",
    description: "Find maximum value in an array",
    query: "max",
  },
  {
    id: "min_by",
    name: "Minimum by field",
    description: "Find item with minimum value for a specific field",
    query: "min_by(.{field})",
    inputs: [{
      name: "field",
      placeholder: "age",
      description: "Field to find minimum by"
    }]
  },
  {
    id: "max_by",
    name: "Maximum by field", 
    description: "Find item with maximum value for a specific field",
    query: "max_by(.{field})",
    inputs: [{
      name: "field",
      placeholder: "score",
      description: "Field to find maximum by"
    }]
  },
  {
    id: "to_entries",
    name: "Object to key-value pairs",
    description: "Convert an object to an array of key-value pairs",
    query: "to_entries",
  },
  {
    id: "find_keys_with_value",
    name: "Find keys with specific value",
    description: "Find all key-value pairs where the value equals something",
    query: ".{object} | to_entries | map(select(.value == \"{value}\"))",
    inputs: [
      {
        name: "object",
        placeholder: "resources",
        description: "Object to search within"
      },
      {
        name: "value",
        placeholder: "Address",
        description: "Value to find"
      }
    ]
  },
  {
    id: "from_entries",
    name: "Key-value pairs to object",
    description: "Convert key-value pairs back to an object",
    query: "from_entries",
  },
  {
    id: "with_entries",
    name: "Transform object entries",
    description: "Transform object by modifying its key-value pairs",
    query: "with_entries(.key |= \"{prefix}\" + .)",
    inputs: [{
      name: "prefix",
      placeholder: "new_",
      description: "Prefix to add to each key"
    }]
  },
  {
    id: "select_keys",
    name: "Select specific keys",
    description: "Keep only specific keys from an object",
    query: "| {key1: .{key1}, key2: .{key2}}",
    inputs: [
      {
        name: "key1",
        placeholder: "name", 
        description: "First key to keep"
      },
      {
        name: "key2",
        placeholder: "age",
        description: "Second key to keep"
      }
    ]
  },
  {
    id: "delete_key",
    name: "Delete key",
    description: "Remove a specific key from objects",
    query: "del(.{key})",
    inputs: [{
      name: "key",
      placeholder: "password",
      description: "Key to remove"
    }]
  },
  {
    id: "add_field",
    name: "Add field",
    description: "Add a new field with a constant value",
    query: ". + {\"new_field\": \"{value}\"}",
    inputs: [{
      name: "value",
      placeholder: "default",
      description: "Value for the new field"
    }]
  },
  {
    id: "rename_field",
    name: "Rename field",
    description: "Rename a field in objects",
    query: ". | {new_name: .{old_name}} + del(.{old_name})",
    inputs: [
      {
        name: "old_name",
        placeholder: "old_field",
        description: "Current field name"
      },
      {
        name: "new_name", 
        placeholder: "new_field",
        description: "New field name"
      }
    ]
  },
  {
    id: "type_filter",
    name: "Filter by type",
    description: "Select values of a specific type",
    query: ".[] | select(type == \"{type}\")",
    inputs: [{
      name: "type",
      placeholder: "string",
      description: "Type to filter by (string, number, boolean, array, object, null)"
    }]
  },
  {
    id: "string_length",
    name: "String length",
    description: "Get length of string values",
    query: ".{field} | length",
    inputs: [{
      name: "field",
      placeholder: "name",
      description: "String field to measure"
    }]
  },
  {
    id: "string_upper",
    name: "Uppercase string",
    description: "Convert string to uppercase",
    query: ".{field} | ascii_upcase",
    inputs: [{
      name: "field",
      placeholder: "name",
      description: "String field to convert"
    }]
  },
  {
    id: "string_lower",
    name: "Lowercase string", 
    description: "Convert string to lowercase",
    query: ".{field} | ascii_downcase",
    inputs: [{
      name: "field",
      placeholder: "name",
      description: "String field to convert"
    }]
  },
  {
    id: "string_split",
    name: "Split string",
    description: "Split a string into an array",
    query: ".{field} | split(\"{delimiter}\")",
    inputs: [
      {
        name: "field",
        placeholder: "email",
        description: "String field to split"
      },
      {
        name: "delimiter",
        placeholder: "@",
        description: "Character to split on"
      }
    ]
  },
  {
    id: "string_replace",
    name: "Replace in string",
    description: "Replace text in a string",
    query: ".{field} | gsub(\"{old}\"; \"{new}\")",
    inputs: [
      {
        name: "field",
        placeholder: "description",
        description: "String field to modify"
      },
      {
        name: "old",
        placeholder: "old text",
        description: "Text to replace"
      },
      {
        name: "new",
        placeholder: "new text", 
        description: "Replacement text"
      }
    ]
  },
  {
    id: "regex_match",
    name: "Regex match",
    description: "Test if string matches a regular expression",
    query: ".{field} | test(\"{pattern}\")",
    inputs: [
      {
        name: "field",
        placeholder: "email",
        description: "String field to test"
      },
      {
        name: "pattern",
        placeholder: "@.*\\.com$",
        description: "Regular expression pattern"
      }
    ]
  },
  {
    id: "recursive_search",
    name: "Recursive search",
    description: "Search for a value anywhere in nested structure",
    query: ".. | select(. == \"{value}\")?",
    inputs: [{
      name: "value",
      placeholder: "search_term",
      description: "Value to search for recursively"
    }]
  },
  {
    id: "paths_to_value",
    name: "Find paths to value",
    description: "Get all paths that lead to a specific value",
    query: "paths(scalars) as $p | select(getpath($p) == \"{value}\") | $p",
    inputs: [{
      name: "value",
      placeholder: "target",
      description: "Value to find paths to"
    }]
  },
  {
    id: "empty_check",
    name: "Check if empty",
    description: "Test if arrays or objects are empty",
    query: ".{field} | length == 0",
    inputs: [{
      name: "field", 
      placeholder: "items",
      description: "Array or object field to check"
    }]
  },
  {
    id: "null_check",
    name: "Check for null",
    description: "Select items where a field is null",
    query: ".[] | select(.{field} == null)",
    inputs: [{
      name: "field",
      placeholder: "optional_field",
      description: "Field to check for null"
    }]
  },
  {
    id: "not_null",
    name: "Filter out nulls",
    description: "Select items where a field is not null",
    query: ".[] | select(.{field} != null)",
    inputs: [{
      name: "field",
      placeholder: "required_field", 
      description: "Field that must not be null"
    }]
  },
  {
    id: "alternative_operator",
    name: "Default value",
    description: "Provide a default value if field is null or missing",
    query: ".{field} // \"{default}\"",
    inputs: [
      {
        name: "field",
        placeholder: "optional_field",
        description: "Field that might be missing"
      },
      {
        name: "default",
        placeholder: "default_value",
        description: "Default value to use"
      }
    ]
  },
  {
    id: "combine_arrays",
    name: "Combine arrays",
    description: "Concatenate multiple arrays into one",
    query: ".{field1} + .{field2}",
    inputs: [
      {
        name: "field1",
        placeholder: "array1",
        description: "First array field"
      },
      {
        name: "field2",
        placeholder: "array2", 
        description: "Second array field"
      }
    ]
  },
  {
    id: "merge_objects",
    name: "Merge objects",
    description: "Combine multiple objects into one",
    query: ".{obj1} + .{obj2}",
    inputs: [
      {
        name: "obj1",
        placeholder: "user",
        description: "First object field"
      },
      {
        name: "obj2",
        placeholder: "profile",
        description: "Second object field"
      }
    ]
  },
  {
    id: "conditional_value",
    name: "Conditional value",
    description: "Set value based on condition",
    query: "if .{field} > {threshold} then \"high\" else \"low\" end",
    inputs: [
      {
        name: "field",
        placeholder: "score", 
        description: "Field to check condition on"
      },
      {
        name: "threshold",
        placeholder: "50",
        description: "Threshold value for condition"
      }
    ]
  }
];

export function JqQueryBuilder({
  isOpen,
  onClose,
  onSubmit,
  initialQuery = "",
}: JqQueryBuilderProps) {
  const [steps, setSteps] = useState<QueryStep[]>([
    { id: "1", type: "identity", value: "" },
  ]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [description, setDescription] = useState("");
  const [validationError, setValidationError] = useState<string>("");
  const [activeTab, setActiveTab] = useState("step-by-step");
  const [popularQueryInputs, setPopularQueryInputs] = useState<Record<string, string>>({});
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [queryToSave, setQueryToSave] = useState("");

  // Function to reload saved queries from localStorage
  const reloadSavedQueries = useCallback(() => {
    try {
      const saved = localStorage.getItem("jq-saved-queries");
      if (saved) {
        setSavedQueries(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading saved queries:", error);
    }
  }, []);

  // Load saved queries from localStorage on component mount
  useEffect(() => {
    reloadSavedQueries();
  }, [reloadSavedQueries]);

  // Reload saved queries when modal opens (in case they were updated externally)
  useEffect(() => {
    if (isOpen) {
      reloadSavedQueries();
    }
  }, [isOpen, reloadSavedQueries]);

  // Reload saved queries when switching to saved tab
  useEffect(() => {
    if (activeTab === "saved") {
      reloadSavedQueries();
    }
  }, [activeTab, reloadSavedQueries]);

  // Save queries to localStorage whenever savedQueries changes
  useEffect(() => {
    try {
      localStorage.setItem("jq-saved-queries", JSON.stringify(savedQueries));
    } catch (error) {
      console.error("Error saving queries:", error);
    }
  }, [savedQueries]);

  // Function to build query from popular query template
  const buildPopularQuery = useCallback((query: PopularQuery) => {
    let builtQuery = query.query;
    
    if (query.inputs) {
      query.inputs.forEach(input => {
        const value = popularQueryInputs[`${query.id}-${input.name}`] || input.placeholder;
        builtQuery = builtQuery.replace(new RegExp(`\\{${input.name}\\}`, 'g'), value);
      });
    }
    
    return builtQuery;
  }, [popularQueryInputs]);

  // Function to save a query
  const saveQuery = useCallback((query: string, name: string, description?: string) => {
    const newSavedQuery: SavedQuery = {
      id: Date.now().toString(),
      name,
      description,
      query,
      createdAt: new Date().toISOString(),
    };
    setSavedQueries(prev => [newSavedQuery, ...prev]);
  }, []);

  // Function to delete a saved query
  const deleteSavedQuery = useCallback((id: string) => {
    setSavedQueries(prev => prev.filter(q => q.id !== id));
  }, []);

  // Function to update popular query input
  const updatePopularQueryInput = useCallback((queryId: string, inputName: string, value: string) => {
    setPopularQueryInputs(prev => ({
      ...prev,
      [`${queryId}-${inputName}`]: value
    }));
  }, []);

  const addStep = useCallback(() => {
    const newStep: QueryStep = {
      id: Date.now().toString(),
      type: "pipe",
      value: "",
    };
    setSteps((prev) => [...prev, newStep]);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((step) => step.id !== stepId));
  }, []);

  const updateStep = useCallback(
    (stepId: string, field: keyof QueryStep, value: string) => {
      setSteps((prev) =>
        prev.map((step) =>
          step.id === stepId ? { ...step, [field]: value } : step
        )
      );
    },
    []
  );

  const resetSteps = useCallback(() => {
    setSteps([{ id: "1", type: "identity", value: "" }]);
  }, []);

  const buildQuery = useCallback((steps: QueryStep[]) => {
    let query = "";
    let needsPipe = false;

    // Helper function to properly format field names
    const formatFieldName = (fieldName: string): string => {
      // Clean up the input - remove leading/trailing spaces and normalize dots
      let cleaned = fieldName.trim();

      // If user already included leading dot, remove it - we'll add it back properly
      if (cleaned.startsWith(".")) {
        cleaned = cleaned.substring(1);
      }

      // Handle empty string after cleanup
      if (!cleaned) {
        return "";
      }

      // Handle chained field access like "resources.$shared"
      if (cleaned.includes(".")) {
        return cleaned
          .split(".")
          .map((part, index) => {
            // Skip empty parts (from double dots, etc.)
            if (!part.trim()) {
              return "";
            }

            const trimmedPart = part.trim();
            // Each part needs individual formatting
            if (
              /^[^a-zA-Z_]|[^a-zA-Z0-9_]/.test(trimmedPart) ||
              trimmedPart.includes(" ")
            ) {
              return index === 0 ? `["${trimmedPart}"]` : `["${trimmedPart}"]`;
            }
            return index === 0 ? `.${trimmedPart}` : `.${trimmedPart}`;
          })
          .join("");
      }

      // Single field name
      if (/^[^a-zA-Z_]|[^a-zA-Z0-9_]/.test(cleaned) || cleaned.includes(" ")) {
        return `["${cleaned}"]`;
      }
      return `.${cleaned}`;
    };

    for (const step of steps) {
      switch (step.type) {
        case "identity":
          query += ".";
          needsPipe = true;
          break;
        case "key":
          if (step.value) {
            const formattedField = formatFieldName(step.value);
            query +=
              needsPipe && !query.endsWith(".")
                ? ` | ${formattedField}`
                : formattedField;
            needsPipe = true;
          }
          break;
        case "index":
          if (step.value) {
            query +=
              needsPipe && !query.endsWith(".")
                ? ` | .[${step.value}]`
                : `.[${step.value}]`;
            needsPipe = true;
          }
          break;
        case "slice":
          if (step.value) {
            query +=
              needsPipe && !query.endsWith(".")
                ? ` | .[${step.value}]`
                : `.[${step.value}]`;
            needsPipe = true;
          }
          break;
        case "iterate":
          query += needsPipe && !query.endsWith(".") ? " | .[]" : ".[]";
          needsPipe = true;
          break;
        case "recursive":
          query += needsPipe ? " | .." : "..";
          needsPipe = true;
          break;
        case "pipe":
          query += " | ";
          needsPipe = false;
          break;
        case "select":
          if (step.selectValue && step.operator) {
            const field = step.selectField?.trim();
            const value = step.selectValue.trim();

            if (value) {
              if (field) {
                // Field-specific selection
                if (step.operator === "test") {
                  query += ` | select(${field} | test("${value}"))`;
                } else {
                  // If value is a number, don't quote it
                  const quotedValue = /^\d+(\.\d+)?$/.test(value)
                    ? value
                    : `"${value}"`;
                  query += ` | select(${field} ${step.operator} ${quotedValue})`;
                }
              } else {
                // Search all keys for the value
                if (step.operator === "test") {
                  query += ` | select(.. | strings | test("${value}"))`;
                } else {
                  // If value is a number, don't quote it
                  const quotedValue = /^\d+(\.\d+)?$/.test(value)
                    ? value
                    : `"${value}"`;
                  query += ` | select(.. | select(. ${step.operator} ${quotedValue}))`;
                }
              }
              needsPipe = true;
            }
          }
          break;
        case "map":
          if (step.value) {
            query += ` | map(${step.value})`;
            needsPipe = true;
          }
          break;
        case "keys":
          query += " | keys";
          needsPipe = true;
          break;
        case "length":
          query += " | length";
          needsPipe = true;
          break;
        case "type":
          query += " | type";
          needsPipe = true;
          break;
        case "to_entries":
          query += " | to_entries";
          needsPipe = true;
          break;
        case "from_entries":
          query += " | from_entries";
          needsPipe = true;
          break;
        case "sort":
          query += " | sort";
          needsPipe = true;
          break;
        case "reverse":
          query += " | reverse";
          needsPipe = true;
          break;
        case "unique":
          query += " | unique";
          needsPipe = true;
          break;
        case "group_by":
          if (step.value) {
            query += ` | group_by(${step.value})`;
            needsPipe = true;
          }
          break;
      }
    }

    return query.trim();
  }, []);

  const generateDescription = useCallback((steps: QueryStep[]) => {
    const parts: string[] = [];

    for (const step of steps) {
      switch (step.type) {
        case "identity":
          parts.push("Start with the root data");
          break;
        case "key":
          if (step.value) {
            parts.push(`extract the '${step.value}' property from each object`);
          }
          break;
        case "index":
          if (step.value) {
            parts.push(`get the element at index ${step.value}`);
          }
          break;
        case "slice":
          if (step.value) {
            parts.push(`get elements from slice ${step.value}`);
          }
          break;
        case "iterate":
          parts.push(
            "iterate over each element in arrays or values in objects"
          );
          break;
        case "recursive":
          parts.push("recursively apply to all nested values");
          break;
        case "pipe":
          parts.push("then");
          break;
        case "select":
          if (step.selectValue && step.operator) {
            if (step.selectField) {
              parts.push(
                `select items where ${step.selectField} ${step.operator} ${step.selectValue}`
              );
            } else {
              parts.push(
                `select items where any field ${step.operator} ${step.selectValue}`
              );
            }
          }
          break;
        case "map":
          if (step.value) {
            parts.push(`apply '${step.value}' to each element`);
          }
          break;
        case "keys":
          parts.push("get all keys");
          break;
        case "length":
          parts.push("get the length");
          break;
        case "type":
          parts.push("get the type");
          break;
        case "to_entries":
          parts.push("convert object to key-value pairs");
          break;
        case "from_entries":
          parts.push("convert key-value pairs to object");
          break;
        case "sort":
          parts.push("sort the results");
          break;
        case "reverse":
          parts.push("reverse the order");
          break;
        case "unique":
          parts.push("remove duplicates");
          break;
        case "group_by":
          if (step.value) {
            parts.push(`group by ${step.value}`);
          }
          break;
      }
    }

    return parts.length > 0 ? `This query will: ${parts.join(", ")}.` : "";
  }, []);

  // Validation function for field names
  const validateFieldName = useCallback((fieldName: string): string => {
    if (!fieldName.trim()) {
      return "Field name cannot be empty";
    }
    // Allow any field name - the formatFieldName function will handle the proper syntax
    return "";
  }, []);

  // Validation function for array indices
  const validateArrayIndex = useCallback((index: string): string => {
    if (!index.trim()) {
      return "Index cannot be empty";
    }
    if (!/^-?\d+$/.test(index.trim())) {
      return "Index must be a number";
    }
    return "";
  }, []);

  // Validation function for array slices
  const validateArraySlice = useCallback((slice: string): string => {
    if (!slice.trim()) {
      return "Slice cannot be empty";
    }
    // Allow formats like: 1:3, :3, 1:, 1:3:2
    if (!/^(-?\d+)?:(-?\d+)?(:-?\d+)?$/.test(slice.trim())) {
      return "Invalid slice format. Use start:end or start:end:step";
    }
    return "";
  }, []);

  // Validation function for select operations
  const validateSelectFields = useCallback((value: string, operator: string): string => {
    if (!value.trim()) {
      return "Value cannot be empty";
    }
    if (!operator.trim()) {
      return "Operator must be selected";
    }
    return "";
  }, []);

  // Use effect to update query when steps change
  const updateQuery = useCallback(() => {
    // Validate all steps first
    let hasErrors = false;
    let errorMessage = "";

    for (const step of steps) {
      if (step.type === "key" && step.value) {
        const error = validateFieldName(step.value);
        if (error) {
          hasErrors = true;
          errorMessage = error;
          break;
        }
      } else if (step.type === "index" && step.value) {
        const error = validateArrayIndex(step.value);
        if (error) {
          hasErrors = true;
          errorMessage = error;
          break;
        }
      } else if (step.type === "slice" && step.value) {
        const error = validateArraySlice(step.value);
        if (error) {
          hasErrors = true;
          errorMessage = error;
          break;
        }
      } else if (step.type === "select") {
        const error = validateSelectFields(step.selectValue || "", step.operator || "");
        if (error) {
          hasErrors = true;
          errorMessage = error;
          break;
        }
      }
    }

    if (hasErrors) {
      setValidationError(errorMessage);
      return;
    }

    setValidationError("");
    const query = buildQuery(steps);
    const desc = generateDescription(steps);
    setCurrentQuery(query);
    setDescription(desc);
  }, [
    steps,
    buildQuery,
    generateDescription,
    validateFieldName,
    validateArrayIndex,
    validateArraySlice,
    validateSelectFields,
  ]);

  // Call updateQuery whenever steps change
  useEffect(() => {
    updateQuery();
  }, [updateQuery]);

  const handleSubmit = useCallback(() => {
    if (validationError || !currentQuery) {
      return;
    }
    onSubmit(currentQuery);
    onClose();
  }, [currentQuery, validationError, onSubmit, onClose]);

  const handleSaveCurrentQuery = useCallback(() => {
    if (!currentQuery) return;
    setQueryToSave(currentQuery);
    setSaveDialogOpen(true);
  }, [currentQuery]);

  const handlePopularQuerySubmit = useCallback((query: PopularQuery) => {
    const builtQuery = buildPopularQuery(query);
    
    // Close modal first for immediate UI feedback
    onClose();
    
    // Then submit the query (which will update search input and run it)
    onSubmit(builtQuery);
  }, [buildPopularQuery, onSubmit, onClose]);

  const handleSavedQuerySubmit = useCallback((query: string) => {
    // Close modal first for immediate UI feedback
    onClose();
    
    // Then submit the query (which will update search input and run it)
    onSubmit(query);
  }, [onSubmit, onClose]);

  const copyQuery = useCallback(() => {
    navigator.clipboard.writeText(currentQuery);
  }, [currentQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl h-[90vh] flex flex-col [&_*]:!text-gray-900"
        style={
          {
            backgroundColor: "white",
            color: "#111827",
            "--background": "0 0% 100%",
            "--foreground": "0 0% 3.9%",
            "--muted-foreground": "0 0% 3.9%",
            "--card": "0 0% 100%",
            "--card-foreground": "0 0% 3.9%",
            "--popover": "0 0% 100%",
            "--popover-foreground": "0 0% 3.9%",
            "--accent": "0 0% 96.1%",
            "--accent-foreground": "0 0% 9%",
            "--input": "0 0% 89.8%",
            "--border": "0 0% 89.8%",
          } as React.CSSProperties
        }
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2 text-gray-900"
            style={{ color: "#111827" }}
          >
            jq Query Builder
            <Badge
              variant="secondary"
              className="!bg-blue-100 !text-blue-800 !border-blue-200"
              style={{
                backgroundColor: "#DBEAFE",
                color: "#1E3A8A",
                border: "1px solid #BFDBFE",
              }}
            >
              Interactive
            </Badge>
          </DialogTitle>
          <DialogDescription
            className="text-gray-700"
            style={{ color: "#374151" }}
          >
            Build jq queries using popular patterns, saved queries, or step-by-step construction.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList 
            className="grid w-full grid-cols-3 !bg-gray-100 !border-gray-300 flex-shrink-0"
            style={{ backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" }}
          >
            <TabsTrigger 
              value="popular"
              className="!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900"
              style={{ color: "#111827" }}
            >
              Popular Queries
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900"
              style={{ color: "#111827" }}
            >
              Saved Queries
            </TabsTrigger>
            <TabsTrigger 
              value="step-by-step"
              className="!text-gray-900 data-[state=active]:!bg-white data-[state=active]:!text-gray-900"
              style={{ color: "#111827" }}
            >
              Step-by-Step
            </TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="flex-1 min-h-0 mt-4">
            <Card className="bg-gray-50 border-gray-300 h-full flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle
                  className="text-lg text-gray-900"
                  style={{ color: "#111827" }}
                >
                  Popular jq Patterns
                </CardTitle>
                <CardDescription
                  className="text-gray-700"
                  style={{ color: "#374151" }}
                >
                  Select from common jq operations. Fill in the parameters to customize each query.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3">
                {POPULAR_QUERIES.map((query) => (
                  <div
                    key={query.id}
                    className="border border-gray-300 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-gray-900" style={{ color: "#111827" }}>
                          {query.name}
                        </h4>
                        <p className="text-sm text-gray-600" style={{ color: "#4B5563" }}>
                          {query.description}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handlePopularQuerySubmit(query)}
                        className="ml-2"
                      >
                        Use
                      </Button>
                    </div>
                    
                    {query.inputs && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                        {query.inputs.map((input) => (
                          <div key={input.name}>
                            <Label
                              className="text-sm text-gray-700"
                              style={{ color: "#374151" }}
                            >
                              {input.description}
                            </Label>
                            <Input
                              placeholder={input.placeholder}
                              value={popularQueryInputs[`${query.id}-${input.name}`] || ""}
                              onChange={(e) =>
                                updatePopularQueryInput(query.id, input.name, e.target.value)
                              }
                              className="text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    <div
                      className="font-mono text-xs bg-gray-100 p-2 rounded border text-gray-900"
                      style={{ color: "#111827" }}
                    >
                      {buildPopularQuery(query)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="saved" className="flex-1 min-h-0 mt-4">
            <Card className="bg-gray-50 border-gray-300 h-full flex flex-col">
              <CardHeader className="pb-2 flex-shrink-0">
                <CardTitle
                  className="text-lg text-gray-900"
                  style={{ color: "#111827" }}
                >
                  Saved Queries
                </CardTitle>
                <CardDescription
                  className="text-gray-700"
                  style={{ color: "#374151" }}
                >
                  Reuse your previously saved jq queries.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-3">
                {savedQueries.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500" style={{ color: "#6B7280" }}>
                      No saved queries yet. Use the Step-by-Step builder and save queries for reuse.
                    </p>
                  </div>
                ) : (
                  savedQueries.map((query) => (
                    <div
                      key={query.id}
                      className="border border-gray-300 rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900" style={{ color: "#111827" }}>
                            {query.name}
                          </h4>
                          {query.description && (
                            <p className="text-sm text-gray-600 mt-1" style={{ color: "#4B5563" }}>
                              {query.description}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1" style={{ color: "#6B7280" }}>
                            Saved {new Date(query.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSavedQuerySubmit(query.query)}
                          >
                            Use
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteSavedQuery(query.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div
                        className="font-mono text-xs bg-gray-100 p-2 rounded border text-gray-900"
                        style={{ color: "#111827" }}
                      >
                        {query.query}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="step-by-step" className="flex-1 min-h-0 mt-4">
            <div className="h-full flex flex-col space-y-6 overflow-y-auto">
          {/* Current Query Display */}
          <Card className="bg-gray-50 border-gray-300">
            <CardHeader className="pb-2">
              <CardTitle
                className="text-lg flex items-center justify-between text-gray-900"
                style={{ color: "#111827" }}
              >
                Generated Query
                <Button variant="ghost" size="sm" onClick={copyQuery}>
                  <Copy className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                className="font-mono text-sm bg-gray-100 p-3 rounded border border-gray-300 text-gray-900"
                style={{ color: "#111827" }}
              >
                {currentQuery || "No query generated yet"}
              </div>
              {validationError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{validationError}</AlertDescription>
                </Alert>
              )}
              {description && !validationError && (
                <div
                  className="text-sm text-gray-700 italic"
                  style={{ color: "#374151" }}
                >
                  {description}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Steps */}
          <Card className="bg-gray-50 border-gray-300">
            <CardHeader className="pb-2">
              <CardTitle
                className="text-lg flex items-center justify-between text-gray-900"
                style={{ color: "#111827" }}
              >
                Query Steps
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={resetSteps}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={addStep}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription
                className="text-gray-700"
                style={{ color: "#374151" }}
              >
                Build your query by adding and configuring steps. Each step
                transforms the data in a specific way.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="border border-gray-300 rounded-lg p-4 bg-white text-gray-900"
                  style={{ color: "#111827" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="!border-gray-800 !text-gray-800"
                        style={{ borderColor: "#1F2937", color: "#1F2937" }}
                      >
                        Step {index + 1}
                      </Badge>
                      {steps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(step.id)}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor={`type-${step.id}`}
                        className="text-gray-900"
                        style={{ color: "#111827" }}
                      >
                        Operation Type
                      </Label>
                      <Select
                        value={step.type}
                        onValueChange={(value) =>
                          updateStep(step.id, "type", value)
                        }
                      >
                        <SelectTrigger className="bg-white text-gray-900">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent
                          className="bg-white border-gray-300"
                          style={{ backgroundColor: "white", color: "#111827" }}
                        >
                          <SelectGroup>
                            <SelectLabel
                              className="text-gray-700"
                              style={{ color: "#374151" }}
                            >
                              General Operations
                            </SelectLabel>
                            {STEP_TYPES.general.map((type) => (
                              <SelectItem
                                key={type.value}
                                value={type.value}
                                className="text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 hover:!text-gray-900 focus:!text-gray-900"
                                style={{ color: "#111827" }}
                              >
                                <div>
                                  <div
                                    className="font-medium text-gray-900"
                                    style={{ color: "#111827" }}
                                  >
                                    {type.label}
                                  </div>
                                  <div
                                    className="text-xs text-gray-600"
                                    style={{ color: "#4B5563" }}
                                  >
                                    {type.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel
                              className="text-gray-700"
                              style={{ color: "#374151" }}
                            >
                              Array Operations
                            </SelectLabel>
                            {STEP_TYPES.arrays.map((type) => (
                              <SelectItem
                                key={type.value}
                                value={type.value}
                                className="text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 hover:!text-gray-900 focus:!text-gray-900"
                                style={{ color: "#111827" }}
                              >
                                <div>
                                  <div
                                    className="font-medium text-gray-900"
                                    style={{ color: "#111827" }}
                                  >
                                    {type.label}
                                  </div>
                                  <div
                                    className="text-xs text-gray-600"
                                    style={{ color: "#4B5563" }}
                                  >
                                    {type.description}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    {(step.type === "key" ||
                      step.type === "index" ||
                      step.type === "slice" ||
                      step.type === "map" ||
                      step.type === "group_by") && (
                      <div>
                        <Label
                          htmlFor={`value-${step.id}`}
                          className="text-gray-900"
                          style={{ color: "#111827" }}
                        >
                          {step.type === "key"
                            ? "Key Name"
                            : step.type === "index"
                            ? "Index"
                            : step.type === "slice"
                            ? "Slice (e.g., 1:3)"
                            : step.type === "map"
                            ? "Expression"
                            : step.type === "group_by"
                            ? "Expression"
                            : "Value"}
                        </Label>
                        <Input
                          id={`value-${step.id}`}
                          value={step.value}
                          onChange={(e) =>
                            updateStep(step.id, "value", e.target.value)
                          }
                          placeholder={
                            step.type === "key"
                              ? "propertyName or resources.$shared"
                              : step.type === "index"
                              ? "0"
                              : step.type === "slice"
                              ? "1:3"
                              : step.type === "map"
                              ? ".name"
                              : step.type === "group_by"
                              ? ".category"
                              : ""
                          }
                        />
                        {step.type === "key" && (
                          <div
                            className="text-xs text-gray-600 mt-1"
                            style={{ color: "#4B5563" }}
                          >
                            Use dot notation for nested access. Input like
                            "resources.$shared" or ".resources.$shared" →
                            .resources["$shared"]
                          </div>
                        )}
                      </div>
                    )}

                    {step.type === "select" && (
                      <div className="md:col-span-2 grid grid-cols-5 gap-2 items-end">
                        <div className="col-span-2">
                          <Label
                            htmlFor={`select-field-${step.id}`}
                            className="text-gray-900"
                            style={{ color: "#111827" }}
                          >
                            Field (optional)
                          </Label>
                          <Input
                            id={`select-field-${step.id}`}
                            value={step.selectField || ""}
                            onChange={(e) =>
                              updateStep(step.id, "selectField", e.target.value)
                            }
                            placeholder=".name (leave empty to search all fields)"
                          />
                        </div>
                        <div className="col-span-1">
                          <Label
                            htmlFor={`operator-${step.id}`}
                            className="text-gray-900"
                            style={{ color: "#111827" }}
                          >
                            Operator
                          </Label>
                          <Select
                            value={step.operator || ""}
                            onValueChange={(value) =>
                              updateStep(step.id, "operator", value)
                            }
                          >
                            <SelectTrigger className="bg-white text-gray-900">
                              <SelectValue placeholder="==" />
                            </SelectTrigger>
                            <SelectContent
                              className="bg-white border-gray-300"
                              style={{
                                backgroundColor: "white",
                                color: "#111827",
                              }}
                            >
                              {OPERATORS.map((op) => (
                                <SelectItem
                                  key={op.value}
                                  value={op.value}
                                  className="text-gray-900 hover:!bg-gray-100 focus:!bg-gray-100 hover:!text-gray-900 focus:!text-gray-900"
                                  style={{ color: "#111827" }}
                                >
                                  <div>
                                    <div
                                      className="font-medium text-gray-900"
                                      style={{ color: "#111827" }}
                                    >
                                      {op.label}
                                    </div>
                                    <div
                                      className="text-xs text-gray-600"
                                      style={{ color: "#4B5563" }}
                                    >
                                      {op.description}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2">
                          <Label
                            htmlFor={`select-value-${step.id}`}
                            className="text-gray-900"
                            style={{ color: "#111827" }}
                          >
                            Value
                          </Label>
                          <Input
                            id={`select-value-${step.id}`}
                            value={step.selectValue || ""}
                            onChange={(e) =>
                              updateStep(step.id, "selectValue", e.target.value)
                            }
                            placeholder="John"
                          />
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2 flex-shrink-0 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {activeTab === "step-by-step" && currentQuery && (
            <Button
              variant="outline"
              onClick={handleSaveCurrentQuery}
              disabled={!currentQuery}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Query
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!currentQuery || !!validationError}
          >
            Use This Query
          </Button>
        </DialogFooter>
        
        {/* Save Query Dialog */}
        {saveDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
              <h3 className="text-lg font-medium mb-4 text-gray-900">Save Query</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const name = formData.get("name") as string;
                  const description = formData.get("description") as string;
                  if (name && queryToSave) {
                    saveQuery(queryToSave, name, description || undefined);
                    setSaveDialogOpen(false);
                    setQueryToSave("");
                  }
                }}
              >
                <div className="mb-4">
                  <Label htmlFor="query-name" className="text-gray-900">
                    Query Name
                  </Label>
                  <Input
                    id="query-name"
                    name="name"
                    placeholder="My useful query"
                    required
                    autoFocus
                  />
                </div>
                <div className="mb-4">
                  <Label htmlFor="query-description" className="text-gray-900">
                    Description (optional)
                  </Label>
                  <Input
                    id="query-description"
                    name="description"
                    placeholder="What does this query do?"
                  />
                </div>
                <div className="mb-4">
                  <Label className="text-gray-700">Query</Label>
                  <div className="font-mono text-sm bg-gray-100 p-2 rounded border text-gray-900">
                    {queryToSave}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSaveDialogOpen(false);
                      setQueryToSave("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
