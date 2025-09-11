export interface Material {
  id: string;
  name: string;
  userId: string;
}

export interface ShoppingListItem extends Omit<Material, 'userId'> {
  quantity?: number;
}

export interface ShoppingList {
  items: ShoppingListItem[];
  userId: string;
}
