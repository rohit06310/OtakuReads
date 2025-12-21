import { createSlice } from '@reduxjs/toolkit'

const mockBooks = [
  {
    id: '1',
    title: 'The World of Attack on Titan',
    author: 'Hajime Isayama',
    price: 199.99,
    coverImage: 'https://imgs.search.brave.com/foqXzf-JAwnW3uA-1DLyBhLYa2Ec1onPoq00QZ52LSI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLnRo/cmlmdGJvb2tzLmNv/bS9hcGkvaW1hZ2Vo/YW5kbGVyL20vQjIy/OUY2QUVGODk1RDQ5/MEUzNUQ2MUU5NTE3/QTA3NjM5MkM2MzAz/RC5qcGVn',
    description: 'Dive deep into the lore, characters, and themes of Attack on Titan with exclusive artwork and author commentary.',
    preview: 'Chapter 1: The Walls and Humanity...',
    downloadUrl: '#',
    category: 'Shonen',
    rating: 4.9,
    pages: 350
  },
  {
    id: '2',
    title: 'My Hero Academia: Official Character Guide',
    author: 'Kohei Horikoshi',
    price: 299.99,
    coverImage: 'https://imgs.search.brave.com/UFGvmSVxowukh4cOmTENErbDNdc2wrZRBADYcMi8FB8/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tLm1l/ZGlhLWFtYXpvbi5j/b20vaW1hZ2VzL0kv/OTFuWmxkbDRCN0wu/anBn',
    description: 'A complete guide to the heroes, quirks, and villains of the My Hero Academia universe.',
    preview: 'Meet Deku, the boy who would be a hero...',
    downloadUrl: '#',
    category: 'Shonen',
    rating: 4.7,
    pages: 300
  },
  {
    id: '3',
    title: 'Demon Slayer: Kimetsu no Yaiba – The Complete Story',
    author: 'Koyoharu Gotouge',
    price: 399.99,
    coverImage: 'https://imgs.search.brave.com/OByyCVp1LwwUWnVrTgaHfw1v_Bp1iltsPXB8tQkYTBU/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pNS53/YWxtYXJ0aW1hZ2Vz/LmNvbS9zZW8vQUJZ/c3R5bGUtVGFuamly/by1hbmQtTmV6dWtv/LURlbW9uLVNsYXll/ci0yMC01LXgtMTUt/UG9zdGVyXzNkMDgx/MTczLTVmZDAtNGM0/Mi05MzM3LWFhNTFj/N2Q3YWVlMC4yYzE1/OTllMmIxZGYyNDcz/YTAzYmM5NmI4ZTdk/ZWNkYS5qcGVnP29k/bkhlaWdodD01ODAm/b2RuV2lkdGg9NTgw/Jm9kbkJnPUZGRkZG/Rg',
    description: 'Relive the emotional and action-packed story of Tanjiro and Nezuko in this official book.',
    preview: 'Chapter 1: Cruelty...',
    downloadUrl: '#',
    category: 'Shonen',
    rating: 4.8,
    pages: 420
  },
  {
    id: '4',
    title: 'Death Note: How to Read 13',
    author: 'Tsugumi Ohba & Takeshi Obata',
    price: 269.99,
    coverImage: 'https://imgs.search.brave.com/F3RmhipGeyvHLmcdOO7c11XnQcPcdEJf2a8_lisaBTs/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvcmVk/LWxpZ2h0LWRlYXRo/LW5vdGUtcGhvbmUt/eTByYnl1cGVheXM1/cTN5bS5qcGc',
    description: 'The ultimate companion book to the legendary Death Note manga, including interviews and insights.',
    preview: 'Ryuk speaks: The story behind the Shinigami...',
    downloadUrl: '#',
    category: 'Seinen',
    rating: 4.6,
    pages: 260
  },
  {
    id: '5',
    title: 'Fullmetal Alchemist: The Complete Artbook',
    author: 'Hiromu Arakawa',
    price: 449.99,
    coverImage: 'https://imgs.search.brave.com/HeJpH7B5xky8yS0gHoGeFpokWsVhbIF7zNjtk3PlrXM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly93YWxs/cGFwZXJzLmNvbS9p/bWFnZXMvaGQvZnVs/bG1ldGFsLWFsY2hl/bWlzdC1lZHdhcmQt/ZWxyaWMtcm9ib3Qt/YXJtLXk4c3hvaDVh/NjJ1cnh3Z2IuanBn',
    description: 'A stunning collection of illustrations and concept art from Fullmetal Alchemist.',
    preview: 'From early sketches to final designs...',
    downloadUrl: '#',
    category: 'Hentai',
    rating: 5.0,
    pages: 280
  },
  {
    id: '6',
    title: 'Naruto: The Official Fanbook',
    author: 'Masashi Kishimoto',
    price: 279.99,
    coverImage: 'https://imgs.search.brave.com/yPaql4zXSfrMLt2wL6R9RPNfQsmFZqL7Y4cEEmS6pdM/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9uYXJ1/dG8tb2ZmaWNpYWwu/Y29tL2FuaW1lL2lt/Z18yLndlYnA',
    description: 'Celebrate Naruto’s journey from outcast to Hokage with trivia, character bios, and original artwork.',
    preview: 'Chapter 1: Naruto Uzumaki, Number One Hyperactive Ninja...',
    downloadUrl: '#',
    category: 'Slice of Life',
    rating: 4.8,
    pages: 310
  },
  {
    id: '7',
    title: 'One Piece: Color Walk Compendium',
    author: 'Eiichiro Oda',
    price: 499.99,
    coverImage: 'https://imgs.search.brave.com/cFWvWKnje7e2CdyQlT_exB5GV0Vj9TbbYv1y0VYPT20/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9zdGF0/aWMwLmNicmltYWdl/cy5jb20vd29yZHBy/ZXNzL3dwLWNvbnRl/bnQvdXBsb2Fkcy8y/MDIzLzA4L29uZS1w/aWVjZS1maWxsZXIu/anBnP3E9NDkmZml0/PWNyb3Amdz0zMTQm/aD0yNDQmZHByPTI',
    description: 'A massive collection of color illustrations spanning years of One Piece adventures.',
    preview: 'Luffy and crew set sail...',
    downloadUrl: '#',
    category: 'Isekai',
    rating: 4.9,
    pages: 500
  },
  {
    id: '8',
    title: 'Jujutsu Kaisen: Official Fan Guide',
    author: 'Gege Akutami',
    price: 319.99,
    coverImage: 'https://imgs.search.brave.com/fh3xVS8ZweRXcTCoMEK4-I-f9vvqiiuvy5zw7VRCdrw/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9pLnBp/bmltZy5jb20vb3Jp/Z2luYWxzL2QwL2Ix/LzlhL2QwYjE5YTc4/YzNjYTI2ODRhYmIw/NjJlZjU2NmZhYWY2/LmpwZw',
    description: 'Explore the dark and thrilling world of Jujutsu Kaisen with detailed profiles and lore.',
    preview: 'Chapter 1: Cursed Energy and Sorcerers...',
    downloadUrl: '#',
    category: 'Seinen',
    rating: 4.7,
    pages: 340
  },
 


]

const bookSlice = createSlice({
  name: 'books',
  initialState: {
    books: mockBooks,
    filteredBooks: mockBooks,
    selectedBook: null,
    loading: false,
    error: null,
    searchQuery: '',
    selectedCategory: 'All',
    categories: ['All', 'Shonen', 'Shojo', 'Seinen', 'Slice of Life','Isekai'],
  },
  reducers: {
    setBooks: (state, action) => {
      state.books = action.payload
      state.filteredBooks = action.payload
    },
    setSelectedBook: (state, action) => {
      state.selectedBook = action.payload
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload
      const query = action.payload.toLowerCase()
      state.filteredBooks = state.books.filter(book => {
        const matchesSearch = book.title.toLowerCase().includes(query) ||
                             book.author.toLowerCase().includes(query)
        const matchesCategory = state.selectedCategory === 'All' || 
                               book.category === state.selectedCategory
        return matchesSearch && matchesCategory
      })
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload
      state.filteredBooks = action.payload === 'All' 
        ? state.books.filter(book =>
            book.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
            book.author.toLowerCase().includes(state.searchQuery.toLowerCase())
          )
        : state.books.filter(book => 
            book.category === action.payload &&
            (book.title.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
             book.author.toLowerCase().includes(state.searchQuery.toLowerCase()))
          )
    },
    addBook: (state, action) => {
      state.books.push(action.payload)
      state.filteredBooks = state.books
    },
    updateBook: (state, action) => {
      const index = state.books.findIndex(book => book.id === action.payload.id)
      if (index !== -1) {
        state.books[index] = action.payload
        state.filteredBooks = state.books
      }
    },
    deleteBook: (state, action) => {
      state.books = state.books.filter(book => book.id !== action.payload)
      state.filteredBooks = state.books
    },
  },
})

export const {
  setBooks,
  setSelectedBook,
  setSearchQuery,
  setSelectedCategory,
  addBook,
  updateBook,
  deleteBook,
} = bookSlice.actions

export default bookSlice.reducer