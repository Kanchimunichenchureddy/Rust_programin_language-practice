#![allow(dead_code)]

// === Rust Intermediate Concepts: Inventory Manager ===

// 1. ENUMS (Custom Data Types)
// Enums define a type by enumerating its possible variants.
#[derive(Debug, Clone)]
enum ItemCategory {
    Electronics,
    Clothing,
    // Enums can hold data! 
    Food { expiration_days: u32 },
}

// 2. STRUCTS (Custom Data Types)
// Structs group related data together.
#[derive(Debug, Clone)]
struct Item {
    id: u32,
    name: String,
    price: f64,
    stock: u32,
    category: ItemCategory,
}

// 3. METHODS
// Methods are tied to a specific struct (or enum) using an `impl` block.
impl Item {
    // A constructor function (often called `new`)
    fn new(id: u32, name: String, price: f64, stock: u32, category: ItemCategory) -> Item {
        Item {
            id,
            name,
            price,
            stock,
            category,
        }
    }

    // A method that borrows the item mutably to change its stock
    fn restock(&mut self, amount: u32) {
        self.stock += amount;
        println!("Restocked {}. New stock: {}", self.name, self.stock);
    }
}

// A Struct to hold our entire inventory
struct Inventory {
    items: Vec<Item>,
}

impl Inventory {
    // 4. OPTION & SLICES & BORROWING
    // `find_item_by_name` borrows the inventory (`&self`) and borrows the search term (`&str`).
    // A String slice (`&str`) is used instead of taking ownership of a `String`.
    // It returns an `Option<&Item>` because the item might not exist.
    fn find_item_by_name(&self, name_query: &str) -> Option<&Item> {
        for item in &self.items {
            if item.name == name_query {
                return Some(item); // Found it! Return a reference to it.
            }
        }
        None // Not found.
    }

    // 5. RESULT & ERROR HANDLING & MUTABLE BORROWING
    // Purchasing an item can fail (e.g., out of stock, not found).
    // We use a `Result`. `Ok(f64)` returns the total price, `Err(String)` returns an error message.
    fn purchase_item(&mut self, item_id: u32, quantity: u32) -> Result<f64, String> {
        // Find the item mutably so we can reduce stock
        for item in &mut self.items {
            if item.id == item_id {
                // We found it, now check stock
                if item.stock >= quantity {
                    item.stock -= quantity; // Reduce stock
                    let total_cost = item.price * (quantity as f64);
                    return Ok(total_cost);
                } else {
                    return Err(format!("Not enough stock for {}. Only {} left.", item.name, item.stock));
                }
            }
        }
        // If the loop finishes without finding the ID
        Err(format!("Item with ID {} not found in inventory.", item_id))
    }
}

fn main() {
    println!("--- Welcome to the Rust Inventory Manager ---");

    // 6. OWNERSHIP IN ACTION
    // We create some items. `main` currently owns these items.
    let laptop = Item::new(1, String::from("Laptop"), 999.99, 5, ItemCategory::Electronics);
    let apple = Item::new(2, String::from("Apple"), 0.50, 100, ItemCategory::Food { expiration_days: 7 });

    // We pass ownership of these items into the `Inventory` struct.
    // We can no longer use `laptop` or `apple` variables directly here!
    let mut store_inventory = Inventory {
        items: vec![laptop, apple], 
    };

    // --- Using Option ---
    println!("\nSearching for 'Laptop':");
    // We pass a String Slice literal ("Laptop") to our method.
    match store_inventory.find_item_by_name("Laptop") {
        Some(item) => println!("Found: {:?}", item), // `{:?}` is used to print structs (needs #[derive(Debug)])
        None => println!("Item not found!"),
    }

    println!("\nSearching for 'Phone':");
    match store_inventory.find_item_by_name("Phone") {
        Some(item) => println!("Found: {:?}", item),
        None => println!("Item not found!"),
    }

    // --- Using Result & Error Handling ---
    println!("\nAttempting Purchases:");
    
    // Successful purchase (ID 1, qty 2)
    match store_inventory.purchase_item(1, 2) {
        Ok(cost) => println!("Success! Total cost: ${:.2}", cost),
        Err(e) => println!("Error: {}", e),
    }

    // Failed purchase (Not enough stock)
    match store_inventory.purchase_item(1, 10) {
        Ok(cost) => println!("Success! Total cost: ${:.2}", cost),
        Err(e) => println!("Error: {}", e),
    }

    // Failed purchase (Item doesn't exist)
    match store_inventory.purchase_item(99, 1) {
        Ok(cost) => println!("Success! Total cost: ${:.2}", cost),
        Err(e) => println!("Error: {}", e),
    }
}
