use std::io::{self, Write};

// --- PART 3: Logic, Functions, and Control Flow ---

// 1. FUNCTIONS: Notice the parameters and return types.
// This function prints the menu. It has no return value.
fn print_menu() {
    println!("\n=== Rust Task Manager ===");
    println!("1. Add a task");
    println!("2. List tasks");
    println!("3. Exit");
    print!("Choose an option: ");
    // Flush stdout to ensure the print! macro output shows up before reading input
    io::stdout().flush().unwrap();
}

// This function takes user input and returns it as a String.
// The `-> String` syntax indicates the return type.
fn get_user_input() -> String {
    let mut input = String::new(); // Mutable string to hold input
    io::stdin().read_line(&mut input).expect("Failed to read line");
    
    // We return the input string, trimming whitespace.
    // Notice there is NO semicolon here. This makes it an EXPRESSION, 
    // meaning the value is returned from the function.
    input.trim().to_string() 
}

// 2. THE MAIN FUNCTION (Topic 3)
fn main() {
    // --- VARIABLES & DATA TYPES (Topics 4 & 5) ---
    // We use a Vector (a growable array) to store our tasks.
    // We use `mut` because we need to add things to it over time.
    let mut tasks: Vec<String> = Vec::new();

    // 3. LOOPS (Topic 8)
    // The `loop` keyword creates an infinite loop. 
    // This is perfect for our main application loop.
    loop {
        print_menu();
        
        let choice = get_user_input();

        // 4. IF / ELSE (Topic 7)
        if choice == "1" {
            print!("Enter task description: ");
            io::stdout().flush().unwrap();
            let new_task = get_user_input();
            
            // Add the task to our vector
            tasks.push(new_task);
            println!("Task added successfully!");

        } else if choice == "2 " {
            println!("\n--- Your Tasks ---");
            
            // Checking if the list is empty
            if tasks.is_empty() {
                println!("No tasks yet! Add some first.");
            } else {
                // The `for` loop (Topic 8) iterates over our collection.
                // We use `.iter().enumerate()` to get both the index (i) and the task.
                for (i, task) in tasks.iter().enumerate() {
                    println!("{}. {}", i + 1, task);
                }
            }
            println!("------------------");

        } else if choice == "3" {
            println!("Goodbye!");
            // The `break` keyword breaks us out of the infinite `loop`.
            break; 
            
        } else {
            // Error handling for invalid input
            println!("Invalid option. Please try again.");
        }
    }
}
