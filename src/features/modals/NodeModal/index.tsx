import React, { useState } from "react";
import type { ModalProps } from "@mantine/core";
import {
  Modal,
  Stack,
  Text,
  ScrollArea,
  Flex,
  CloseButton,
  Textarea,
  Button,
  Group,
} from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";

// Format node content for display/editing
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return JSON.stringify(nodeRows[0].value);

  const obj: Record<string, any> = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// Format JSON path for display
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  // Get the selected node data
  const nodeData = useGraph(state => state.selectedNode);
  
  // Local state for edit mode and edited content
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  // Handler for Edit button
  const handleEdit = () => {
    if (!nodeData) return;
    setEditValue(normalizeNodeData(nodeData.text ?? []));
    setIsEditing(true);
  };

  // Handler for Save button
  const handleSave = () => {
    if (!nodeData) return;
    try {
      // Parse the edited value to ensure valid JSON
      const parsed = JSON.parse(editValue);
      
      // Get current full JSON
      const currentJson = JSON.parse(useJson.getState().getJson());
      
      // Get path to this node
      const path = nodeData.path ?? [];
      
      // If editing root node
      if (path.length === 0) {
        useJson.getState().setJson(JSON.stringify(parsed, null, 2));
      } else {
        // Walk the path to find the parent object
        let target = currentJson;
        for (let i = 0; i < path.length - 1; i++) {
          target = target[path[i]];
        }
              const lastKey = path[path.length - 1];
              if (target == null) throw new Error("Invalid path while updating JSON");
              const existing = target[lastKey as any];
              if (
                existing !== null &&
                typeof existing === "object" &&
                !Array.isArray(existing) &&
                parsed !== null &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
              ) {
                // merge so nested keys (details/nutrients) are preserved
                target[lastKey as any] = { ...existing, ...parsed };
              } else {
                // default: replace
                target[lastKey as any] = parsed;
              }
        
        // Save the entire updated JSON back to the store
        useJson.getState().setJson(JSON.stringify(currentJson, null, 2));
      }
      
      // Reset edit state and close modal
      setIsEditing(false);
      setEditValue("");
      onClose?.();
    } catch (err) {
      alert("Invalid JSON format!");
    }
  };

  // Handler for Cancel button
  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Flex justify="space-between" align="center">
          <Text fz="xs" fw={500}>
            Content
          </Text>
          <CloseButton onClick={onClose} />
        </Flex>

        {isEditing ? (
          <>
            {/* Edit mode */}
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.currentTarget.value)}
              minRows={6}
              autosize
              maw={600}
            />
            <Group justify="flex-end" mt="sm">
              <Button size="xs" onClick={handleSave}>
                Save
              </Button>
              <Button size="xs" variant="light" onClick={handleCancel}>
                Cancel
              </Button>
            </Group>
          </>
        ) : (
          <>
            {/* View mode */}
            <ScrollArea.Autosize mah={250} maw={600}>
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                language="json"
                withCopyButton
              />
            </ScrollArea.Autosize>
            <Button size="xs" mt="xs" onClick={handleEdit}>
              Edit
            </Button>
          </>
        )}

        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            language="json"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};