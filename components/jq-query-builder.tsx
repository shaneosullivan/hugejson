"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
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
import { Plus, Minus, Copy, RotateCcw } from "lucide-react";

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
}

const STEP_TYPES = [
  { value: "identity", label: "Identity (.)", description: "Pass through the input unchanged" },
  { value: "key", label: "Object Key (.key)", description: "Extract a specific key from objects" },
  { value: "index", label: "Array Index (.[0])", description: "Extract element at specific index" },
  { value: "slice", label: "Array Slice (.[1:3])", description: "Extract array slice" },
  { value: "iterate", label: "Iterate (.[])", description: "Iterate over array or object values" },
  { value: "recursive", label: "Recursive (..))", description: "Recursively apply to all values" },
  { value: "pipe", label: "Pipe (|)", description: "Pipe output to next operation" },
  { value: "select", label: "Select", description: "Select items matching condition" },
  { value: "map", label: "Map", description: "Apply operation to each element" },
  { value: "keys", label: "Keys", description: "Get object keys or array indices" },
  { value: "length", label: "Length", description: "Get length of array or object" },
  { value: "type", label: "Type", description: "Get type of value" },
  { value: "sort", label: "Sort", description: "Sort array or object" },
  { value: "reverse", label: "Reverse", description: "Reverse array" },
  { value: "unique", label: "Unique", description: "Remove duplicates from array" },
  { value: "group_by", label: "Group By", description: "Group array elements by expression" }
];

const OPERATORS = [
  { value: "==", label: "Equal (==)", description: "Check if values are equal" },
  { value: "!=", label: "Not Equal (!=)", description: "Check if values are not equal" },
  { value: "<", label: "Less Than (<)", description: "Check if left is less than right" },
  { value: "<=", label: "Less or Equal (<=)", description: "Check if left is less than or equal to right" },
  { value: ">", label: "Greater Than (>)", description: "Check if left is greater than right" },
  { value: ">=", label: "Greater or Equal (>=)", description: "Check if left is greater than or equal to right" },
  { value: "contains", label: "Contains", description: "Check if array/string contains value" },
  { value: "startswith", label: "Starts With", description: "Check if string starts with value" },
  { value: "endswith", label: "Ends With", description: "Check if string ends with value" },
  { value: "test", label: "Test (regex)", description: "Test string against regular expression" }
];

export function JqQueryBuilder({ isOpen, onClose, onSubmit, initialQuery = "" }: JqQueryBuilderProps) {
  const [steps, setSteps] = useState<QueryStep[]>([
    { id: "1", type: "identity", value: "" }
  ]);
  const [currentQuery, setCurrentQuery] = useState("");
  const [description, setDescription] = useState("");

  const addStep = useCallback(() => {
    const newStep: QueryStep = {
      id: Date.now().toString(),
      type: "pipe",
      value: ""
    };
    setSteps(prev => [...prev, newStep]);
  }, []);

  const removeStep = useCallback((stepId: string) => {
    setSteps(prev => prev.filter(step => step.id !== stepId));
  }, []);

  const updateStep = useCallback((stepId: string, field: keyof QueryStep, value: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, [field]: value } : step
    ));
  }, []);

  const resetSteps = useCallback(() => {
    setSteps([{ id: "1", type: "identity", value: "" }]);
  }, []);

  const buildQuery = useCallback((steps: QueryStep[]) => {
    let query = "";
    let needsPipe = false;

    for (const step of steps) {
      switch (step.type) {
        case "identity":
          query += ".";
          needsPipe = true;
          break;
        case "key":
          if (step.value) {
            query += needsPipe && !query.endsWith(".") ? ` | .${step.value}` : `.${step.value}`;
            needsPipe = true;
          }
          break;
        case "index":
          if (step.value) {
            query += needsPipe && !query.endsWith(".") ? ` | .[${step.value}]` : `.[${step.value}]`;
            needsPipe = true;
          }
          break;
        case "slice":
          if (step.value) {
            query += needsPipe && !query.endsWith(".") ? ` | .[${step.value}]` : `.[${step.value}]`;
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
          if (step.value && step.operator) {
            query += ` | select(${step.value} ${step.operator === "test" ? `| test("${step.value.split(' ')[1] || ''}")` : `${step.operator} ${step.value.split(' ')[1] || ''}`})`;
            needsPipe = true;
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
          parts.push("iterate over each element in arrays or values in objects");
          break;
        case "recursive":
          parts.push("recursively apply to all nested values");
          break;
        case "pipe":
          parts.push("then");
          break;
        case "select":
          if (step.value && step.operator) {
            const [field, value] = step.value.split(' ');
            parts.push(`select items where ${field} ${step.operator} ${value || ''}`);
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

    return parts.length > 0 ? `This query will: ${parts.join(', ')}.` : "";
  }, []);

  // Use effect to update query when steps change
  const updateQuery = useCallback(() => {
    const query = buildQuery(steps);
    const desc = generateDescription(steps);
    setCurrentQuery(query);
    setDescription(desc);
  }, [steps, buildQuery, generateDescription]);

  // Call updateQuery whenever steps change
  useEffect(() => {
    updateQuery();
  }, [updateQuery]);

  const handleSubmit = useCallback(() => {
    onSubmit(currentQuery);
    onClose();
  }, [currentQuery, onSubmit, onClose]);

  const copyQuery = useCallback(() => {
    navigator.clipboard.writeText(currentQuery);
  }, [currentQuery]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            jq Query Builder
            <Badge variant="secondary">Interactive</Badge>
          </DialogTitle>
          <DialogDescription>
            Build complex jq queries step by step. Each step will be combined to create your final query.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Query Display */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                Generated Query
                <Button variant="ghost" size="sm" onClick={copyQuery}>
                  <Copy className="w-4 h-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="font-mono text-sm bg-gray-100 dark:bg-gray-800 p-3 rounded border">
                {currentQuery || "No query generated yet"}
              </div>
              {description && (
                <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {description}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Query Steps */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
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
              <CardDescription>
                Build your query by adding and configuring steps. Each step transforms the data in a specific way.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Step {index + 1}</Badge>
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
                      <Label htmlFor={`type-${step.id}`}>Operation Type</Label>
                      <Select
                        value={step.type}
                        onValueChange={(value) => updateStep(step.id, "type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STEP_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-xs text-gray-500">{type.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {(step.type === "key" || step.type === "index" || step.type === "slice" || 
                      step.type === "select" || step.type === "map" || step.type === "group_by") && (
                      <div>
                        <Label htmlFor={`value-${step.id}`}>
                          {step.type === "key" ? "Key Name" :
                           step.type === "index" ? "Index" :
                           step.type === "slice" ? "Slice (e.g., 1:3)" :
                           step.type === "select" ? "Field and Value (e.g., .age 25)" :
                           step.type === "map" ? "Expression" :
                           step.type === "group_by" ? "Expression" : "Value"}
                        </Label>
                        <Input
                          id={`value-${step.id}`}
                          value={step.value}
                          onChange={(e) => updateStep(step.id, "value", e.target.value)}
                          placeholder={
                            step.type === "key" ? "propertyName" :
                            step.type === "index" ? "0" :
                            step.type === "slice" ? "1:3" :
                            step.type === "select" ? ".age 25" :
                            step.type === "map" ? ".name" :
                            step.type === "group_by" ? ".category" : ""
                          }
                        />
                      </div>
                    )}

                    {step.type === "select" && (
                      <div className="md:col-span-2">
                        <Label htmlFor={`operator-${step.id}`}>Comparison Operator</Label>
                        <Select
                          value={step.operator || ""}
                          onValueChange={(value) => updateStep(step.id, "operator", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>
                                <div>
                                  <div className="font-medium">{op.label}</div>
                                  <div className="text-xs text-gray-500">{op.description}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!currentQuery}>
            Use This Query
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}