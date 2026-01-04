export type CategoryNode = {
  id: string;
  name: string;
  parentId: string | null;
  bgColor?: string | null;
  childrenBgColor?: string | null;
  children?: CategoryNode[];
};

export type TxCategory = {
  id: string;
  name: string;
  parent?: { id: string; name: string } | null;
};

export type Transaction = {
  id: string;
  date: string;
  amount: string;
  note?: string | null;
  category: TxCategory;
};