import {
    useMemo, useState
} from "react"

import assets from "../../../../data/assets.json";

const starterAnimals = [
    {
        id: 1,
        name: "Max",
        species: "Dog",
        breed: "Shih Tzu",
        age: "2 years",
        status: "available",
    },
    {
        id: 2,
        name: "Luna",
        species: "Cat",
        breed: "Persian",
        age: "1 year",
        status: "available",
    },
    {
        id: 3,
        name: "Oreo",
        species: "Dog",
        breed: "Aspin",
        age: "3 years",
        status: "not_available",
    },
]

export default function AnimalProfiles() {
    const [animals, setAnimals] = useState(starterAnimals);

    const [animalForm, setAnimalForm] = useState ({
        name : "",
        species : "",
        breed : "",
        age : "",
        status : "",
    });

    const totalAnimals = animals.length;

    const availableAnimals = useMemo(() => {
        return animals.filter((animal) => animal.status === "available").length;
    }, [animals]);

    function handleAddAnimal(e) {
        e.preventDefault();

        const newAnimal = {
            id : Date.now(),
            ...animalForm,
        };

        setAnimals((current) => [newAnimal, ...current]);

        setAnimalForm({
            name : "",
            species : "",
            breed : "",
            age : "",
            status : "available",
        });
    }

    return (
        <section className="admin-animal-page">
            <div className="admin-animal-stats">
                <article className="admin-stat-card">
                    <div>
                        <p>Total animals in system</p>
                        <h3>{totalAnimals}</h3>
                    </div>
                    
                    <img src = {assets.icons.brownPaw}/>
                </article>
                
                <article className="admin-stat-card">
                    <div>
                        <p>Available for adoption</p>
                        <h3>{availableAnimals}</h3>
                    </div>

                    <img src = {assets.icons.brownHouse}/>
                </article>
            </div>

            <div className="admin-animal-grid">
                <section className="admin-panel admin-animal-form-panel">
                    <div className="admin-panel-heading">
                        <h2>Add Animal Profile</h2>
                    </div>

                    <form className="admin-animal-form" onSubmit={handleAddAnimal}>
                        <label>
                            Animal Name
                            <input 
                                type = "text"
                                value = {animalForm.name}
                                onChange={(e) => 
                                    setAnimalForm({
                                        ...animalForm,
                                        name : e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Species
                            <input
                                type="text"
                                value={animalForm.species}
                                onChange={(e) =>
                                    setAnimalForm({
                                        ...animalForm,
                                        species : e.target.value,
                                    })
                                }
                                placeholder="Dog, Cat, etc."
                                required
                            />
                        </label>

                        <label>
                            Breed
                            <input 
                                type = "text"
                                value = {animalForm.breed}
                                onChange={(e) =>
                                    setAnimalForm({
                                        ...animalForm,
                                        breed : e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Age
                            <input 
                                type="text"
                                value={animalForm.age}
                                onChange={(e) => 
                                    setAnimalForm({
                                        ...animalForm,
                                        age : e.target.value,
                                    })
                                }
                                placeholder="Example: 2 Years"
                                required
                            />
                        </label>

                        <label>
                            Status
                            <select
                                value = {animalForm.status}
                                onChange={(e) =>
                                    setAnimalForm({
                                        ...animalForm,
                                        status : e.target.value,
                                    })
                                }
                            >
                                <option value="available">Available</option>
                                <option value="not_available">Not Available</option>
                            </select>
                        </label>

                        <button type="submit">Add Animal</button>
                    </form>
                </section>

                <section className="admin-panel admin-animal-list-panel">
                    <div className="admin-panel-heading">
                        <h2>Animal Profiles</h2>
                    </div>

                    <div className="admin-animal-list">
                        {animals.map((animal) => (
                            <article className="admin-animal-row" key={animal.id}>
                                <div>
                                    <h3>{animal.name}</h3>
                                    <p>
                                        {animal.species} • {animal.breed} • {animal.age}
                                    </p>
                                </div>

                                <span className={`admin-status-pill ${animal.status}`}>
                                    {animal.status === "available"
                                        ? "Available"
                                        : "Not available"
                                    }
                                </span>
                            </article>
                        ))}
                    </div>

                </section>
            </div>

        </section>
    );
}