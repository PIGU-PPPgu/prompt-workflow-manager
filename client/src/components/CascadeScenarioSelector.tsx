import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

interface CascadeScenarioSelectorProps {
  value?: number;
  onChange: (scenarioId: number | undefined) => void;
  label?: string;
}

export function CascadeScenarioSelector({ value, onChange, label = "应用场景" }: CascadeScenarioSelectorProps) {
  const { data: allScenarios } = trpc.scenarios.list.useQuery();

  const [level1Id, setLevel1Id] = useState<number | undefined>();
  const [level2Id, setLevel2Id] = useState<number | undefined>();
  const [level3Id, setLevel3Id] = useState<number | undefined>();

  // 从scenarioId反推三级选择
  useEffect(() => {
    if (!value || !allScenarios) {
      setLevel1Id(undefined);
      setLevel2Id(undefined);
      setLevel3Id(undefined);
      return;
    }

    const scenario = allScenarios.find(s => s.id === value);
    if (!scenario) return;

    if (scenario.level === 1) {
      setLevel1Id(scenario.id);
      setLevel2Id(undefined);
      setLevel3Id(undefined);
    } else if (scenario.level === 2) {
      setLevel1Id(scenario.parentId || undefined);
      setLevel2Id(scenario.id);
      setLevel3Id(undefined);
    } else if (scenario.level === 3) {
      const parent2 = allScenarios.find(s => s.id === scenario.parentId);
      if (parent2) {
        setLevel1Id(parent2.parentId || undefined);
        setLevel2Id(parent2.id);
        setLevel3Id(scenario.id);
      }
    }
  }, [value, allScenarios]);

  // 获取各级分类选项
  const level1Scenarios = allScenarios?.filter(s => s.level === 1) || [];
  const level2Scenarios = level1Id
    ? allScenarios?.filter(s => s.level === 2 && s.parentId === level1Id) || []
    : [];
  const level3Scenarios = level2Id
    ? allScenarios?.filter(s => s.level === 3 && s.parentId === level2Id) || []
    : [];

  // 处理一级选择
  const handleLevel1Change = (val: string) => {
    const id = val === "0" ? undefined : Number(val);
    setLevel1Id(id);
    setLevel2Id(undefined);
    setLevel3Id(undefined);
    onChange(id);
  };

  // 处理二级选择
  const handleLevel2Change = (val: string) => {
    const id = val === "0" ? undefined : Number(val);
    setLevel2Id(id);
    setLevel3Id(undefined);
    onChange(id);
  };

  // 处理三级选择
  const handleLevel3Change = (val: string) => {
    const id = val === "0" ? undefined : Number(val);
    setLevel3Id(id);
    onChange(id);
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      {/* 一级：大类 */}
      <Select
        value={level1Id?.toString() || "0"}
        onValueChange={handleLevel1Change}
      >
        <SelectTrigger>
          <SelectValue placeholder="选择大类" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="0">无</SelectItem>
          {level1Scenarios.map((scenario) => (
            <SelectItem key={scenario.id} value={scenario.id.toString()}>
              {scenario.icon} {scenario.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* 二级：学科/领域 */}
      {level1Id && level2Scenarios.length > 0 && (
        <Select
          value={level2Id?.toString() || "0"}
          onValueChange={handleLevel2Change}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择学科/领域" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">仅选大类</SelectItem>
            {level2Scenarios.map((scenario) => (
              <SelectItem key={scenario.id} value={scenario.id.toString()}>
                {scenario.icon} {scenario.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 三级：教学环节 */}
      {level2Id && level3Scenarios.length > 0 && (
        <Select
          value={level3Id?.toString() || "0"}
          onValueChange={handleLevel3Change}
        >
          <SelectTrigger>
            <SelectValue placeholder="选择具体环节" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">仅选学科</SelectItem>
            {level3Scenarios.map((scenario) => (
              <SelectItem key={scenario.id} value={scenario.id.toString()}>
                {scenario.icon} {scenario.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* 当前选择提示 */}
      {(level1Id || level2Id || level3Id) && (
        <p className="text-xs text-muted-foreground">
          已选择: {
            allScenarios?.find(s => s.id === (level3Id || level2Id || level1Id))?.name || '未知'
          }
        </p>
      )}
    </div>
  );
}
