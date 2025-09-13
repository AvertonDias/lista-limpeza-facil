import { Timestamp } from "firebase/firestore";

export interface Material {
  id: string;
  name: string;
  userId: string;
}

export interface ShoppingListItem extends Omit<Material, 'userId'> {
  quantity?: number;
  createdAt?: Timestamp;
}

export interface ShoppingList {
  items: ShoppingListItem[];
  userId: string;
}

export interface Feedback {
  id: string;
  listOwnerId: string;
  type: 'suggestion' | 'doubt';
  text: string;
  name?: string;
  createdAt: Timestamp;
  status: 'new' | 'read';
}
