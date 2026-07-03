const RECENT_IMAGES = [
  { src: '/gallery/blowjob.png', category: 'Blowjob' },
  { src: '/gallery/cuckold.jpg', category: 'Cuckold' },
  { src: '/gallery/milf.jpg', category: 'Milf' },
  { src: '/gallery/pussy.jpg', category: 'Pussy' },
  { src: '/gallery/yuri.jpg', category: 'Yuri' },
];

export default function RecentGenerations() {
  return (
    <section class="py-12 sm:py-24 bg-muted/30 rounded-2xl sm:rounded-3xl">
      <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-8 sm:mb-10">
          <h2 class="text-2xl sm:text-4xl font-bold tracking-tight text-balance mb-4">
            Recent Generations
          </h2>
          <p class="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
            See what others are creating with our unrestricted AI image generator.
          </p>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {RECENT_IMAGES.map((img) => (
            <div
              key={img.category}
              class="relative rounded-2xl overflow-hidden border border-border bg-card aspect-square"
            >
              <div class="w-full h-full overflow-hidden">
                <img
                  src={img.src}
                  alt={img.category}
                  class="w-full h-full object-cover"
                  style={{ filter: 'blur(12px)', transform: 'scale(1.05)' }}
                />
              </div>
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div class="absolute bottom-3 left-3">
                <span class="text-xs font-medium text-foreground bg-background/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                  {img.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
