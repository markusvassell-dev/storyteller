/**
 * Candidate public-domain children's books to probe on the GITenberg mirror.
 *
 * `title` must be the Project Gutenberg title, because the mirror's repository
 * name is that title slugified plus the ebook id. Where a repo name is known
 * to differ, set `repo` explicitly.
 *
 * This list is deliberately broad — `probe.ts` reports which entries actually
 * exist and which carry illustrations, and the curated catalog is built from
 * the results.
 */

export interface Candidate {
  title: string
  pgId: number
  repo?: string
}

export const CANDIDATES: Candidate[] = [
  // --- Grimm ---
  { title: 'Household Stories by the Brothers Grimm', pgId: 19068 },
  { title: "Grimm's Fairy Tales", pgId: 2591 },
  { title: "Grimm's Fairy Stories", pgId: 11027 },
  { title: 'Fairy Tales of the Brothers Grimm', pgId: 22555 },
  { title: 'The Fairy Tales of the Brothers Grimm', pgId: 52521 },

  // --- Andersen ---
  { title: "Andersen's Fairy Tales", pgId: 1597 },
  { title: 'Fairy Tales of Hans Christian Andersen', pgId: 27200 },
  { title: "Hans Andersen's Fairy Tales", pgId: 32571 },
  { title: 'Stories from Hans Andersen', pgId: 30437 },

  // --- Aesop ---
  { title: 'The Aesop for Children', pgId: 19994 },
  { title: "Aesop's Fables", pgId: 21 },
  { title: "Aesop's Fables; a new translation", pgId: 11339 },
  { title: 'The Fables of Aesop', pgId: 28 },

  // --- Jacobs / Lang fairy-tale collections ---
  { title: 'English Fairy Tales', pgId: 7439 },
  { title: 'More English Fairy Tales', pgId: 7440 },
  { title: 'Celtic Fairy Tales', pgId: 7885 },
  { title: 'Indian Fairy Tales', pgId: 7128 },
  { title: 'Europa’s Fairy Book', pgId: 25433 },
  { title: 'The Blue Fairy Book', pgId: 503 },
  { title: 'The Red Fairy Book', pgId: 540 },
  { title: 'The Green Fairy Book', pgId: 33571 },
  { title: 'The Yellow Fairy Book', pgId: 641 },

  // --- Beatrix Potter ---
  { title: 'The Tale of Peter Rabbit', pgId: 14838 },
  { title: 'The Tale of Squirrel Nutkin', pgId: 14407 },
  { title: 'The Tale of Benjamin Bunny', pgId: 15234 },
  { title: 'The Tale of Two Bad Mice', pgId: 14814 },
  { title: 'The Tale of Mrs. Tiggy-Winkle', pgId: 15137 },
  { title: 'The Tale of Jemima Puddle-Duck', pgId: 14814 },
  { title: 'The Tale of Tom Kitten', pgId: 14805 },
  { title: 'The Tailor of Gloucester', pgId: 14837 },

  // --- Picture-book & nonsense classics ---
  { title: 'A Apple Pie', pgId: 15809 },
  { title: 'Under the Window', pgId: 34946 },
  { title: 'The Book of Nonsense', pgId: 982 },
  { title: 'A Book of Nonsense', pgId: 13646 },
  { title: 'Nonsense Songs', pgId: 13650 },
  { title: 'The Owl and the Pussy-Cat', pgId: 30525 },
  { title: 'The Real Mother Goose', pgId: 24022 },
  { title: 'Mother Goose in Prose', pgId: 517 },
  { title: 'The Baby’s Opera', pgId: 25433 },
  { title: 'Denslow’s Mother Goose', pgId: 22572 },
  { title: 'The Night Before Christmas', pgId: 17135 },

  // --- Poetry & verse ---
  { title: "A Child's Garden of Verses", pgId: 25609 },
  { title: 'Sing-Song: A Nursery Rhyme Book', pgId: 19188 },
  { title: 'Songs of Innocence and of Experience', pgId: 1934 },

  // --- Story classics (illustrated editions preferred) ---
  { title: 'The Jungle Book', pgId: 236 },
  { title: 'The Second Jungle Book', pgId: 1937 },
  { title: 'Just So Stories', pgId: 2781 },
  { title: 'The Wind in the Willows', pgId: 27805 },
  { title: "Alice's Adventures in Wonderland", pgId: 11 },
  { title: 'Through the Looking-Glass', pgId: 12 },
  { title: 'The Wonderful Wizard of Oz', pgId: 55 },
  { title: 'The Marvelous Land of Oz', pgId: 54 },
  { title: 'Ozma of Oz', pgId: 33361 },
  { title: 'Peter Pan', pgId: 16 },
  { title: 'Peter Pan in Kensington Gardens', pgId: 26999 },
  { title: 'The Secret Garden', pgId: 113 },
  { title: 'A Little Princess', pgId: 146 },
  { title: 'Little Lord Fauntleroy', pgId: 479 },
  { title: 'Black Beauty', pgId: 271 },
  { title: 'Heidi', pgId: 1448 },
  { title: 'The Adventures of Pinocchio', pgId: 500 },
  { title: 'Pinocchio: The Tale of a Puppet', pgId: 16865 },
  { title: 'The Water-Babies', pgId: 1018 },
  { title: 'Five Children and It', pgId: 778 },
  { title: 'The Story of the Treasure Seekers', pgId: 770 },
  { title: 'The Railway Children', pgId: 1874 },
  { title: 'The Princess and the Goblin', pgId: 34339 },
  { title: 'At the Back of the North Wind', pgId: 225 },
  { title: 'The Velveteen Rabbit', pgId: 11757 },
  { title: 'A Wonder-Book for Girls and Boys', pgId: 32242 },
  { title: 'Tanglewood Tales', pgId: 976 },
  { title: 'The Arabian Nights Entertainments', pgId: 5667 },
  { title: 'Anne of Green Gables', pgId: 45 },
  { title: 'Little Women', pgId: 514 },
  { title: 'The Adventures of Tom Sawyer', pgId: 74 },
  { title: 'Treasure Island', pgId: 120 },
  { title: 'The Wonderful Adventures of Nils', pgId: 12181 },
  { title: 'Old Mother West Wind', pgId: 15791 },
  { title: 'The Burgess Bird Book for Children', pgId: 16377 },
  { title: 'The Adventures of Reddy Fox', pgId: 4979 },
]
